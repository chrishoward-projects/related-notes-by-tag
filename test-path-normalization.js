// Test script for path normalization edge cases
// Run with: node test-path-normalization.js

function normalizePath(path) {
  // Remove leading/trailing slashes, handle edge cases
  return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

function testPathNormalization() {
  const testCases = [
    // Basic cases
    { input: '/Personal/Journal', expected: 'Personal/Journal' },
    { input: 'Personal/Journal/', expected: 'Personal/Journal' },
    { input: 'Personal/Journal', expected: 'Personal/Journal' },
    
    // Edge cases with multiple slashes
    { input: '//Personal//Journal//', expected: 'Personal/Journal' },
    { input: '///Personal///Journal///', expected: 'Personal/Journal' },
    
    // Root cases
    { input: '/', expected: '' },
    { input: '//', expected: '' },
    { input: '', expected: '' },
    
    // Single folder
    { input: '/Work', expected: 'Work' },
    { input: 'Work/', expected: 'Work' },
    { input: '//Work//', expected: 'Work' },
    
    // Deep paths
    { input: '/Personal/Journal/2024/January', expected: 'Personal/Journal/2024/January' },
    { input: '//Personal//Journal//2024//January//', expected: 'Personal/Journal/2024/January' },
    
    // Special characters (spaces, hyphens, underscores)
    { input: '/My Projects/Work-Stuff/test_file', expected: 'My Projects/Work-Stuff/test_file' },
    { input: '//My Projects//Work-Stuff//test_file//', expected: 'My Projects/Work-Stuff/test_file' }
  ];

  console.log('Testing Path Normalization...\n');
  let passed = 0;
  let failed = 0;

  testCases.forEach((test, index) => {
    const result = normalizePath(test.input);
    const success = result === test.expected;
    
    console.log(`Test ${index + 1}: ${success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Input: "${test.input}"`);
    console.log(`  Expected: "${test.expected}"`);
    console.log(`  Got: "${result}"`);
    
    if (success) {
      passed++;
    } else {
      failed++;
      console.log(`  ERROR: Expected "${test.expected}" but got "${result}"`);
    }
    console.log('');
  });

  console.log(`Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Test folder exclusion logic
function testFolderExclusionLogic() {
  console.log('\nTesting Folder Exclusion Logic...\n');
  
  function isFileInExcludedFolder(filePath, exclusions) {
    return exclusions.some(exclusion => {
      const normalizedExclusionPath = normalizePath(exclusion.path);
      const normalizedFilePath = normalizePath(filePath);
      
      if (exclusion.includeChildren) {
        // Check if file is in folder or any subfolder
        return normalizedFilePath.startsWith(normalizedExclusionPath + '/') ||
               normalizedFilePath === normalizedExclusionPath;
      } else {
        // Check if file is directly in the folder (not subfolders)
        const fileDir = normalizedFilePath.substring(0, normalizedFilePath.lastIndexOf('/'));
        return fileDir === normalizedExclusionPath;
      }
    });
  }

  const testCases = [
    // Include children = true
    {
      name: 'Include children - direct file',
      filePath: '/Personal/note.md',
      exclusions: [{ path: '/Personal', includeChildren: true }],
      expected: true // Should be excluded (file is directly in excluded folder)
    },
    {
      name: 'Include children - subfolder file', 
      filePath: '/Personal/Journal/daily.md',
      exclusions: [{ path: '/Personal', includeChildren: true }],
      expected: true // Should be excluded
    },
    {
      name: 'Include children - deep subfolder',
      filePath: '/Personal/Journal/2024/January/note.md', 
      exclusions: [{ path: '/Personal', includeChildren: true }],
      expected: true // Should be excluded
    },
    
    // Include children = false
    {
      name: 'Direct only - direct file',
      filePath: '/Personal/note.md',
      exclusions: [{ path: '/Personal', includeChildren: false }],
      expected: true // Should be excluded (direct in folder)
    },
    {
      name: 'Direct only - subfolder file',
      filePath: '/Personal/Journal/daily.md',
      exclusions: [{ path: '/Personal', includeChildren: false }],
      expected: false // Should NOT be excluded (in subfolder)
    },
    
    // No match cases
    {
      name: 'Different folder',
      filePath: '/Work/project.md',
      exclusions: [{ path: '/Personal', includeChildren: true }],
      expected: false // Should NOT be excluded
    },
    
    // Multiple exclusions
    {
      name: 'Multiple exclusions - match first',
      filePath: '/Personal/Journal/note.md',
      exclusions: [
        { path: '/Personal', includeChildren: true },
        { path: '/Work', includeChildren: false }
      ],
      expected: true // Should be excluded by first rule
    }
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach((test, index) => {
    const result = isFileInExcludedFolder(test.filePath, test.exclusions);
    const success = result === test.expected;
    
    console.log(`Test ${index + 1}: ${success ? '✅ PASS' : '❌ FAIL'} - ${test.name}`);
    console.log(`  File: "${test.filePath}"`);
    console.log(`  Exclusions: ${JSON.stringify(test.exclusions)}`);
    console.log(`  Expected: ${test.expected}, Got: ${result}`);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
    console.log('');
  });

  console.log(`Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run all tests
console.log('='.repeat(50));
console.log('FOLDER EXCLUSION FEATURE TESTING');
console.log('='.repeat(50));

const pathNormalizationPassed = testPathNormalization();
const folderExclusionPassed = testFolderExclusionLogic();

console.log('\n' + '='.repeat(50));
console.log('FINAL RESULTS');
console.log('='.repeat(50));
console.log(`Path Normalization: ${pathNormalizationPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Folder Exclusion Logic: ${folderExclusionPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Overall: ${pathNormalizationPassed && folderExclusionPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);