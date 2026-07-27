const { connectDB, client } = require('./server/db.cjs');

async function run() {
  const args = process.argv.slice(2);
  const password = args[0];
  
  if (!password) {
    console.error('Error: Please provide a password as an argument.');
    console.log('Usage: node register_user.cjs <your_desired_password>');
    process.exit(1);
  }

  try {
    const db = await connectDB();
    const username = 'aryan.saxena@uncompromised.in';
    const role = 'admin';

    // Check if user already exists
    const existing = await db.collection('users').findOne({ username });
    if (existing) {
      // Update password if they already exist
      await db.collection('users').updateOne(
        { username },
        { $set: { password } }
      );
      console.log(`Successfully updated password for ${username} to: ${password}`);
    } else {
      // Create new user
      await db.collection('users').insertOne({
        username,
        password,
        role,
        created_at: new Date().toISOString()
      });
      console.log(`Successfully registered new Admin user ${username} with password: ${password}`);
    }
  } catch (err) {
    console.error('Database insertion error:', err);
  } finally {
    if (client) await client.close();
  }
}

run();
