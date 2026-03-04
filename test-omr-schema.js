const database = require('./config/database');

async function checkSchema() {
  try {
    console.log('\n🔍 Checking omr_processing_logs schema...\n');
    
    const [rows] = await database.query('DESCRIBE omr_processing_logs');
    console.table(rows);
    
    console.log('\n✅ Schema check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkSchema();
