### logpager README

logpager is a very basic extension for opening large files by implementing paging instead of attempting to load the entire file to memory.

This overcomes the issue where you need to modify the settings.json file to try and exctend the memory as we now only need to load the file to memory in chunks.

#### Features

File is broken down into chunks of 1 mb and each chunk becomes a page
