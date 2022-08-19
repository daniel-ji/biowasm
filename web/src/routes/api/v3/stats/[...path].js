import CONFIG from "@/biowasm.json";

// GET /api/v3/stats
// GET /api/v3/stats/:tool
// GET /api/v3/stats/:tool/:version
// GET /api/v3/stats/:tool/:version/:program
// Format: {
//   stats: {
//     tool: {
//       version: {
//         program: {  // <-- only if `program` is specified in URL
//           "YY-MM-DD": 123,
//           [...]
//           "total": 123
//         }
//       }
//     }
//   }
// }
export async function GET({ request, platform, params }) {
	let [toolName, versionName, programName] = params.path.split("/", 3);
	toolName ||= null, versionName ||= null, programName ||= null;

	// Input validation
	if(toolName !== null) {
		const tool = CONFIG.tools.find(t => t.name === toolName);
		if(!tool)
			return error(params);

		// Get matching version(s)
		if(versionName !== null) {
			const version = tool.versions.find(v => v.version === versionName);
			if(!version)
				return error(params);

			// Get matching program(s)
			if(programName !== null) {
				const program = tool.programs.find(p => p === programName);
				if(!program)
					return error(params);
			}
		}
	}

	// Get stats from KV (faster than querying all Durable Objects)
	let stats = platform === undefined ? getMockStats() : await platform.env.CDN.get("STATS", { type: "json" });

	// Subset stats based on URL parameters
	if(toolName !== null)
		stats = { [toolName]: stats[toolName] };
	if(versionName !== null)
		stats[toolName] = { [versionName]: stats[toolName][versionName] };

	return {
		status: 200,
		body: { stats }
	};
}

// Return error response
function error(params) {
	return {
		status: 404,
		body: { error: "Could not find tool", params }
	};
}

// Generate mock stats for local development
function getMockStats() {
	const stats = { "2022-07-01": 10, "2022-07-02": 20, "total": 30 };
	return {
		samtools: {
			"1.10": stats
		},
		seqtk: {
			"1.2": stats,
			"1.3": stats
		},
		coreutils: {
			"8.32": stats
		}
	};
}
