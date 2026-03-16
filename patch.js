const fs = require('fs');
const path = 'components/dashboard/pages/dashboard-home.tsx';
let code = fs.readFileSync(path, 'utf8');

// Insert floating debug div before final return
code = code.replace(
  'return (',
  `return (
    <>
      <div style={{ position: "fixed", bottom: 0, right: 0, background: "rgba(0,0,0,0.8)", color: "white", zIndex: 9999, padding: "10px", fontFamily: "monospace", fontSize: "10px" }}>
        Debug:<br/>
        isLoading: {String(isLoading)}<br/>
        allSessions: {totalSessions}<br/>
        fetchData time: {new Date().toISOString()}<br/>
        user.id: {user.id}<br/>
      </div>
  `
);

// close the fragment
code = code.replace(
  /    <\/div>\n  \)\n}\n*$/,
  `    </div>\n    </>\n  )\n}\n`
);

fs.writeFileSync(path, code);
