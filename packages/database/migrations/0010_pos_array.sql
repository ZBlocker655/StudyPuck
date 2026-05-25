ALTER TABLE "cards" ALTER COLUMN "part_of_speech" TYPE text[] USING
  CASE WHEN "part_of_speech" IS NULL THEN NULL ELSE ARRAY["part_of_speech"] END;
