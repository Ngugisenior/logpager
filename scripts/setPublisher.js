const fs = require('fs');
const path = require('path');

// Debug: Log the environment variable to see if it's set correctly
console.log("PUBLISHER_NAME from environment:", process.env.PUBLISHER_NAME);

// Ensure the environment variable exists, if not, log the error
if (!process.env.PUBLISHER_NAME) {
    console.error('Error: PUBLISHER_NAME environment variable is not set.');
    process.exit(1);  // Exit with error code 1 if the environment variable is missing
} else {
    // Retrieve publisher value from the environment variable
    const publisher = process.env.PUBLISHER_NAME;

    // Path to package.json
    const packageJsonPath = path.join(__dirname, '../package.json');

    // Debug: Log the path to ensure it's correct
    console.log('Package.json path:', packageJsonPath);

    // Check if the package.json file exists
    if (!fs.existsSync(packageJsonPath)) {
        console.error('Error: package.json not found at the specified path.');
        process.exit(1);  // Exit with error code 1 if package.json does not exist
    }

    // Read the package.json file
    const packageJson = require(packageJsonPath);

    // Debug: Log the current contents of package.json to ensure we're modifying the correct file
    console.log('Current package.json contents:', packageJson);

    // Update the publisher field in package.json
    packageJson.publisher = publisher;

    // Write the updated package.json back to disk
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

    // Log success
    console.log(`Updated publisher in package.json to: ${publisher}`);
}
