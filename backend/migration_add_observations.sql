-- Migration: Add observations column to appointments table
ALTER TABLE appointments ADD COLUMN observations TEXT AFTER status;
