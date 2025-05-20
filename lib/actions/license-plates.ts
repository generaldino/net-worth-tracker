import { db } from "@/db";
import { licensePlates, countries, users, carMakes, images } from "@/db/schema";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { desc, eq, count } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getImagesByLicensePlateId } from "./images";

export async function getLicensePlates(page = 1) {
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(licensePlates);

  // Get paginated plates
  const plates = await db
    .select({
      id: licensePlates.id,
      plateNumber: licensePlates.plateNumber,
      createdAt: licensePlates.createdAt,
      countryId: licensePlates.countryId,
      country: countries.name, // Join with countries table
      caption: licensePlates.caption,
      userId: licensePlates.userId,
      carMakeId: licensePlates.carMakeId,
      carMake: carMakes.name, // Join with car_makes table
      categoryId: licensePlates.categoryId,
      reporter: users.name,
    })
    .from(licensePlates)
    .leftJoin(users, eq(licensePlates.userId, users.id))
    .leftJoin(countries, eq(licensePlates.countryId, countries.id))
    .leftJoin(carMakes, eq(licensePlates.carMakeId, carMakes.id))
    .orderBy(desc(licensePlates.createdAt))
    .limit(ITEMS_PER_PAGE)
    .offset(from)
    .then(async (results) => {
      // Get images for each license plate
      const platesWithDetails = await Promise.all(
        results.map(async (plate) => {
          const images = await getImagesByLicensePlateId(plate.id);
          return {
            ...plate,
            reporter: plate.reporter || "Unknown",
            images,
          };
        })
      );
      return platesWithDetails;
    });

  const pageCount = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0;

  return {
    plates: plates || [],
    pagination: {
      total: count || 0,
      page,
      pageSize: ITEMS_PER_PAGE,
      pageCount,
    },
  };
}

// Fetch a license plate by its ID
export async function getLicensePlateById(id: string) {
  try {
    const [licensePlate] = await db
      .select()
      .from(licensePlates)
      .where(eq(licensePlates.id, id))
      .leftJoin(users, eq(licensePlates.userId, users.id));

    if (!licensePlate) {
      return null;
    }

    return {
      ...licensePlate.license_plates,
      reporter: licensePlate.users?.name || "Anonymous",
      reporterAvatar: licensePlate.users?.avatarUrl || null,
    };
  } catch (error) {
    console.error("Error fetching license plate by ID:", error);
    return null;
  }
}

// Fetch a license plate by its plate number
export async function getLicensePlateByPlateNumber(plateNumber: string) {
  try {
    const [licensePlate] = await db
      .select()
      .from(licensePlates)
      .where(eq(licensePlates.plateNumber, plateNumber))
      .leftJoin(users, eq(licensePlates.userId, users.id));

    if (!licensePlate) {
      return null;
    }

    return {
      ...licensePlate.license_plates,
      reporter: licensePlate.users?.name || "Anonymous",
      reporterAvatar: licensePlate.users?.avatarUrl || null,
    };
  } catch (error) {
    console.error("Error fetching license plate by plate number:", error);
    return null;
  }
}

// Fetch all license plates with pagination
export async function getAllLicensePlates(page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;

    const results = await db
      .select()
      .from(licensePlates)
      .leftJoin(users, eq(licensePlates.userId, users.id))
      .orderBy(desc(licensePlates.createdAt))
      .limit(limit)
      .offset(offset);

    return results.map((result) => ({
      ...result.license_plates,
      reporter: result.users?.name || "Anonymous",
      reporterAvatar: result.users?.avatarUrl || null,
    }));
  } catch (error) {
    console.error("Error fetching license plates:", error);
    return [];
  }
}

// Count total license plates
export async function countLicensePlates() {
  try {
    const result = await db.select({ value: count() }).from(licensePlates);

    return Number(result[0]?.value || 0);
  } catch (error) {
    console.error("Error counting license plates:", error);
    return 0;
  }
}
