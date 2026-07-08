const { connectDB, client } = require('./server/db.cjs');

const INITIAL_MAPPINGS = [
  { partner_name: "Ashok Kumar Jain HUF", poc: "Saurabh" },
  { partner_name: "STERLING FARM RESEARCH & SERVICES P. LTD. ( Raj)", poc: "Sikander" },
  { partner_name: "Seva Mandir", poc: "Sikander" },
  { partner_name: "Hardik Sutreja", poc: "Sikander" },
  { partner_name: "Crossroads International School", poc: "Ashima" },
  { partner_name: "FAKHRUDDIN RANGWALA", poc: "Sikander" },
  { partner_name: "R.C. Goyal", poc: "Ashima" },
  { partner_name: "Abhijeet Sharma", poc: "Prerna" },
  { partner_name: "Jamna Lal Ji Dangi B2B", poc: "Prerna" },
  { partner_name: "Nihal jain", poc: "Prerna" },
  { partner_name: "Charu Lata Sharma", poc: "Prerna" },
  { partner_name: "Mona Kothari", poc: "Prerna" },
  { partner_name: "Abhimanyu Singh ji", poc: "Prerna" },
  { partner_name: "Asrar Ali", poc: "Prerna" },
  { partner_name: "Walk In Office", poc: "Prerna" },
  { partner_name: "Varsha Ji", poc: "Prerna" },
  { partner_name: "dr radhika", poc: "Prerna" },
  { partner_name: "Bhawna Bhandari", poc: "Prerna" },
  { partner_name: "Dr .Rachna Jain", poc: "Prerna" },
  { partner_name: "Purilal ji", poc: "Prerna" },
  { partner_name: "Radhika UFU", poc: "Prerna" },
  { partner_name: "Dr. Sangeeta Sen", poc: "Prerna" },
  { partner_name: "Saumya Tiwari", poc: "Prerna" },
  { partner_name: "Jaspal Uf", poc: "Prerna" },
  { partner_name: "Bina Gupta Ji", poc: "Prerna" },
  { partner_name: "Sunil Joshi", poc: "Prerna" },
  { partner_name: "Dr. Neera vyas", poc: "Prerna" },
  { partner_name: "Lakshmi Didi urban", poc: "Prerna" },
  { partner_name: "NC Jain", poc: "Prerna" },
  { partner_name: "Aarti Lodha", poc: "Prerna" },
  { partner_name: "Neha Jain", poc: "Prerna" },
  { partner_name: "Meena Jain", poc: "Prerna" },
  { partner_name: "T.M. Shrinath", poc: "Prerna" },
  { partner_name: "Gaurav Jain", poc: "Prerna" },
  { partner_name: "Dr. Fatima Siraj", poc: "Prerna" },
  { partner_name: "Mahiraj Pratap Singh", poc: "Prerna" },
  { partner_name: "Gautam Meena", poc: "Prerna" },
  { partner_name: "Amrita Nandi", poc: "Prerna" },
  { partner_name: "Rachit Singh Bolia", poc: "Prerna" },
  { partner_name: "Lovely Agrawal", poc: "Prerna" },
  { partner_name: "Bhagyashree", poc: "Prerna" },
  { partner_name: "Ayushi Jain", poc: "Prerna" },
  { partner_name: "Chitra ji", poc: "Prerna" },
  { partner_name: "Gourav Meghwal", poc: "Prerna" },
  { partner_name: "Richa BSF", poc: "Prerna" },
  { partner_name: "Amba lal ji B2B", poc: "Prerna" },
  { partner_name: "sehjo", poc: "Prerna" },
  { partner_name: "Indra Darji", poc: "Prerna" },
  { partner_name: "Barkha Singhani", poc: "Prerna" },
  { partner_name: "Avinash Ji", poc: "Prerna" },
  { partner_name: "Nidhi Shah", poc: "Prerna" },
  { partner_name: "Liesl Van Derwyk", poc: "Prerna" },
  { partner_name: "Vijay Chordia", poc: "Prerna" },
  { partner_name: "Yuvraj", poc: "Prerna" },
  { partner_name: "Jaya Sabji Bhandar B2B", poc: "Prerna" },
  { partner_name: "TARUSHIKA JI", poc: "Prerna" },
  { partner_name: "Yashi Singh Choudhary", poc: "Prerna" },
  { partner_name: "Tejpal singh", poc: "Prerna" },
  { partner_name: "Shibashish sahoo", poc: "Prerna" },
  { partner_name: "Analise", poc: "Prerna" },
  { partner_name: "Kriti Mathur", poc: "Prerna" },
  { partner_name: "Rekha Jain", poc: "Prerna" },
  { partner_name: "Ritik Borana UF", poc: "Prerna" },
  { partner_name: "Seema Ji", poc: "Prerna" },
  { partner_name: "Delhi Gate Mandi", poc: "Prerna" },
  { partner_name: "Sandeep Bhandari", poc: "Prerna" },
  { partner_name: "shibashish", poc: "Prerna" },
  { partner_name: "Manohar Singh Ashiya", poc: "Prerna" },
  { partner_name: "Renu Jhala", poc: "Prerna" },
  { partner_name: "Radha didi Urban", poc: "Prerna" },
  { partner_name: "Ganesh Dixit", poc: "Prerna" },
  { partner_name: "Sushila ji", poc: "Prerna" },
  { partner_name: "Diksha Jain", poc: "Prerna" },
  { partner_name: "Kaltki Ji", poc: "Prerna" },
  { partner_name: "Anil Jain", poc: "Prerna" },
  { partner_name: "Dr. Renu Mishra", poc: "Prerna" },
  { partner_name: "Divya Tapodhan", poc: "Prerna" },
  { partner_name: "Ruchi", poc: "Prerna" },
  { partner_name: "Balveer Singh Ji", poc: "Prerna" },
  { partner_name: "Sony Mehta", poc: "Prerna" },
  { partner_name: "Shobha ji", poc: "Prerna" },
  { partner_name: "Nishkarsh", poc: "Prerna" },
  { partner_name: "Hussain Ji", poc: "Prerna" },
  { partner_name: "Parul 1", poc: "Prerna" },
  { partner_name: "Ajay Joshi", poc: "Prerna" }
];

async function seed() {
  try {
    const db = await connectDB();
    console.log('Clearing old mappings...');
    await db.collection('partner_pocs').deleteMany({});
    
    console.log('Inserting initial mappings...');
    await db.collection('partner_pocs').insertMany(INITIAL_MAPPINGS);
    
    console.log('Adding unique index on partner_name...');
    await db.collection('partner_pocs').createIndex({ partner_name: 1 }, { unique: true });
    
    console.log('Seed completed successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    if (client) await client.close();
  }
}

seed();
