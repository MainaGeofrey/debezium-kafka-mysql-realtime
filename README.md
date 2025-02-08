## Debezium MySQL Connector Setup

### Connector Configuration

```json
{
    "name": "mysql-connector",
    "config": {
        "connector.class": "io.debezium.connector.mysql.MySqlConnector",
        "database.hostname": "mysql",
        "database.port": "3306",
        "database.user": "root",
        "database.password": "root",
        "database.server.id": "184054",
        "database.server.name": "dbserver1",
        "database.include.list": "test_db",
        "schema.history.internal": "io.debezium.storage.kafka.history.KafkaSchemaHistory",
        "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
        "schema.history.internal.kafka.topic": "dbhistory.test_db",
        "topic.prefix": "dbserver1"
    }
}
```

### Issue Description

The Debezium MySQL connector initially failed due to a missing `KafkaSchemaHistory` configuration. The error resembled an issue documented with the Debezium Oracle connector, as detailed in this [Stack Overflow post](https://stackoverflow.com/questions/74244658/debezium-oracle-connector-service-not-starting).

### Solution

Debezium 2.x versions require explicit schema history configurations, which were optional in earlier versions. To resolve this:

1. **Add Schema History Properties:** Ensure the following properties are included in your connector configuration:
    - `schema.history.internal`: Specifies the internal schema history storage class.
    - `schema.history.internal.kafka.bootstrap.servers`: Kafka server details for schema history.
    - `schema.history.internal.kafka.topic`: Kafka topic for storing schema history.

2. **Deploy the Connector:**
   Post the updated configuration to your Kafka Connect endpoint:

   ```bash
   curl -X POST -H "Content-Type: application/json" \
   --data @mysql-connector-config.json \
   http://localhost:8083/connectors
   ```

### Final State

After applying these changes, the connector transitioned to a **RUNNING** state:

```json
{
    "name": "mysql-connector",
    "connector": {
        "state": "RUNNING",
        "worker_id": "172.23.0.5:8083"
    },
    "tasks": [
        {
            "id": 0,
            "state": "RUNNING",
            "worker_id": "172.23.0.5:8083"
        }
    ],
    "type": "source"
}
```

### Troubleshooting Steps and Docker Commands

To debug network issues and ensure proper Docker setup, the following steps were performed:

1. **Remove Existing Docker Containers and Networks:**
   ```bash
   docker-compose down
   docker network prune -f
   docker volume prune -f
   docker system prune -a -f
   ```

2. **Rebuild and Restart Docker Compose:**
   ```bash
   docker-compose up --build -d
   ```

3. **Check Docker Networks:**
   ```bash
   docker network ls
   docker network inspect <network_name>
   ```

4. **Debug Kafka Topics:**
   ```bash
   docker exec -it debeziumkafka-kafka-1 kafka-topics --bootstrap-server kafka:9092 --list
   docker exec -it debeziumkafka-kafka-1 kafka-topics --bootstrap-server kafka:9092 --create --topic dbhistory.test_db --partitions 1 --replication-factor 1
   ```

5. **Verify Connector Status:**
   ```bash
   curl -s http://localhost:8083/connectors/mysql-connector/status | jq
   ```

### Testing the Setup

After successfully configuring and running the Debezium MySQL connector, real-time change data capture (CDC) from MySQL was tested with the following steps:

1. **Perform Data Modifications in MySQL:**
   - **Insert New Data:**
     ```sql
     INSERT INTO customers (first_name, last_name, email) 
     VALUES ('Alice', 'Wonderland', 'alice@example.com');
     ```
   - **Update Data:**
     ```sql
     UPDATE customers 
     SET email = 'alice.updated@example.com' 
     WHERE first_name = 'Alice';
     ```
   - **Delete Data:**
     ```sql
     DELETE FROM customers 
     WHERE first_name = 'Alice';
     ```

2. **Consume Kafka Messages to Verify Changes:**
   ```bash
   docker exec -it debeziumkafka-kafka-1 kafka-console-consumer \
     --bootstrap-server kafka:9092 \
     --topic dbserver1.test_db.customers \
     --from-beginning
   ```

3. **Sample Output:**
   - **Insert Event:**
     ```json
     {
       "before": null,
       "after": {
         "id": 3,
         "first_name": "Alice",
         "last_name": "Wonderland",
         "email": "alice@example.com"
       },
       "op": "c"
     }
     ```

   - **Update Event:**
     ```json
     {
       "before": {
         "id": 3,
         "first_name": "Alice",
         "last_name": "Wonderland",
         "email": "alice@example.com"
       },
       "after": {
         "id": 3,
         "first_name": "Alice",
         "last_name": "Wonderland",
         "email": "alice.updated@example.com"
       },
       "op": "u"
     }
     ```

   - **Delete Event:**
     ```json
     {
       "before": {
         "id": 3,
         "first_name": "Alice",
         "last_name": "Wonderland",
         "email": "alice.updated@example.com"
       },
       "after": null,
       "op": "d"
     }
     ```

By following these steps, real-time data changes from MySQL were successfully captured and consumed via Kafka topics.