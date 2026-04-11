
import { db } from './src/db';
import { bookings } from './src/db/schema';
import { ilike, or, eq } from 'drizzle-orm';

async function findBooking() {
  try {
    const result = await db.query.bookings.findMany({
      where: or(
        eq(bookings.customerEmail, 'boris90guardado@gmail.com'),
        ilike(bookings.customerName, '%BORIS%')
      ),
      with: {
        branch: true,
        service: true,
        staff: true
      }
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

findBooking();
