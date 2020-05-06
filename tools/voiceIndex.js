const fs = require('fs');
const path = require('path');

const voicePath = path.resolve(__dirname, '../assets/voice/');

if (!fs.existsSync(voicePath)) {
  console.error(`Voice directory not found: ${voicePath}`);
  process.exit(1);
}

const langCodes = fs
  .readdirSync(voicePath)
  .filter(name => fs.statSync(path.resolve(voicePath, name)).isDirectory());

langCodes.forEach(langCode => {
  const list = fs
    .readdirSync(path.resolve(voicePath, langCode))
    .map(fileName => fileName.replace(/\.wav$/, ''));

  fs.writeFileSync(
    path.resolve(__dirname, '../config/voice/', `${langCode}.json`),
    JSON.stringify(list, undefined, '\t'),
  );
});
