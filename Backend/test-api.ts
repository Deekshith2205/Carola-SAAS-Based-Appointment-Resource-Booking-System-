import * as jwt from 'jsonwebtoken';
import { env } from './src/config/env';

async function main() {
  const token = jwt.sign(
    { sub: '123e4567-e89b-12d3-a456-426614174000', email: 'test@test.com', role: 'CUSTOMER' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    const res = await fetch('http://localhost:5000/api/v1/appointments?limit=5', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (err: any) {
    console.error(err.message);
  }
}

main();
