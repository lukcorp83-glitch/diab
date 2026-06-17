const fs = require('fs');
const glob = require('glob'); // Need to find where saveMultipleLogs is

const files = glob.sync('src/**/*.ts*');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('saveMultipleLogs')) {
        console.log(file);
    }
});
