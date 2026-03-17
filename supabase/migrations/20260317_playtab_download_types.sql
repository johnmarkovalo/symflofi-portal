-- Add PlayTab download types (apk, firmware) to firmware_downloads
ALTER TABLE firmware_downloads DROP CONSTRAINT IF EXISTS firmware_downloads_file_type_check;
ALTER TABLE firmware_downloads ADD CONSTRAINT firmware_downloads_file_type_check
  CHECK (file_type IN ('image', 'update', 'apk', 'firmware'));
