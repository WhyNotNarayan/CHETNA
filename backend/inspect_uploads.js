const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  console.log('Uploads directory does not exist');
  process.exit(1);
}

const files = fs.readdirSync(uploadDir);
console.log(`Found ${files.length} files in uploads:`);

files.forEach(file => {
  const filePath = path.join(uploadDir, file);
  const stats = fs.statSync(filePath);
  const buffer = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  console.log(`\nFile: ${file}`);
  console.log(`Size: ${stats.size} bytes`);
  console.log(`Hex header: ${buffer.toString('hex')}`);
  console.log(`ASCII header: ${buffer.toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);
});
