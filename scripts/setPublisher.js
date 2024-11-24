const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get publisher name from environment variable
console.log("PUBLISHER_NAME from environment:", process.env.PUBLISHER_NAME);

// Ensure the environment variable exists, if not, log the error
if (!process.env.PUBLISHER_NAME) {
    console.error('Error: PUBLISHER_NAME environment variable is not set.');
    process.exit(1);  // Exit with error code 1
} else {
    const publisher = process.env.PUBLISHER_NAME;

    // Get the remote URL of the Git repository (origin)
    let repositoryUrl;
    try {
        repositoryUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    } catch (error) {
        console.error('Error: Unable to get the Git remote URL:', error.message);
        process.exit(1);  // Exit with error code 1
    }

    // Path to the package.json file
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = require(packageJsonPath);

    // Update the publisher and repository fields in package.json
    packageJson.publisher = publisher;
    packageJson.repository = {
        type: 'git',
        url: repositoryUrl
    };

    // Write the updated package.json back to disk
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

    console.log(`Updated publisher in package.json to: ${publisher}`);
    console.log(`Updated repository in package.json to: ${repositoryUrl}`);
}
