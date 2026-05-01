import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './src/models/user.model';

async function checkUser() {
  await mongoose.connect(process.env.MONGO_URI!);
  const user = await User.findOne({ email: 'efraincamargo01@gmail.com' });
  console.log('User data:', JSON.stringify(user, null, 2));
  process.exit(0);
}

checkUser();
