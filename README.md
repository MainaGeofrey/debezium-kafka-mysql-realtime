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
