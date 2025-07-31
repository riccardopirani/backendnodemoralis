-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "address" VARCHAR(255),
ADD COLUMN     "birthday" DATE,
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "gender" VARCHAR(50),
ADD COLUMN     "nationality" VARCHAR(100),
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "province" VARCHAR(100),
ADD COLUMN     "state" VARCHAR(100),
ADD COLUMN     "streetNumber" VARCHAR(20),
ADD COLUMN     "surname" VARCHAR(100);
