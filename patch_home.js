const fs = require('fs');
let code = fs.readFileSync('components/dashboard/pages/dashboard-home.tsx', 'utf8');

// remove ErrorBoundary
code = code.replace(/<ErrorBoundary>/g, '');
code = code.replace(/<\/ErrorBoundary\s*>/g, '');
code = code.replace(/import React from "react";\s*class ErrorBoundary[\s\S]*?\}\s*\}\s*\}\s*/g, '');

// inject console.log
code = code.replace('setIsLoading(false)', 'setIsLoading(false); console.log("FINISHED FETCH"); alert("FINISHED FETCH");');

fs.writeFileSync('components/dashboard/pages/dashboard-home.tsx', code);
