const { Kafka } = require('kafkajs');

// Initialize Kafka connection
const kafka = new Kafka({
    clientId: 'debezium-listener',
    brokers: ['localhost:9092'],  // Replace 'localhost' with 'kafka' if running in Docker
});

// Create a consumer instance
const consumer = kafka.consumer({ groupId: 'debezium-group' });

const run = async () => {
    // Connect the consumer
    await consumer.connect();

    // Subscribe to the Debezium topic
    await consumer.subscribe({ topic: 'dbserver1.test_db.customers', fromBeginning: true });

    console.log('Listening for changes on dbserver1.test_db.customers...');

    // Listen for new messages
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const key = message.key ? message.key.toString() : null;
            const value = message.value ? message.value.toString() : null;
            const offset = message.offset;

            console.log(`Received message - Key: ${key}, Value: ${value}, Offset: ${offset}`);

            // Parse and handle the JSON payload
            if (value) {
                const payload = JSON.parse(value);
                console.log('Change detected:', JSON.stringify(payload, null, 2));
            }
        },
    });
};

// Handle errors gracefully
run().catch(e => {
    console.error(`[debezium-listener] ${e.message}`, e);
    process.exit(1);
});
