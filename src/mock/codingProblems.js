export const codingProblems = [
  {
    id: "p1",
    title: "Smart Warehouse Package Routing",
    difficulty: "Medium",
    category: "E-Commerce",
    tags: ["Arrays", "Hash Map", "Backend"],
    roles: ["Backend Developer", "Full Stack Developer", "General Software"],
    caseStudy: "A large e-commerce company operates multiple warehouses. Every package contains a destination code and priority level. The warehouse management system needs to efficiently group packages before dispatch to minimize delivery trucks.",
    description: "You are given a list of package records. Each package contains a destination identifier and priority. Your task is to determine the minimum number of dispatch groups required such that no two packages in the same group have the same destination, and the sum of priorities in a group does not exceed max_priority.",
    inputFormat: "packages: Array of [destination, priority]\nmax_priority: Integer representing maximum priority sum per group.",
    outputFormat: "Return an integer representing the minimum number of dispatch groups.",
    examples: [
      {
        input: "packages = [[1, 3], [2, 1], [1, 2]], max_priority = 5",
        output: "2",
        explanation: "Packages with destination 1 cannot be in the same group. So we need at least 2 groups. Group 1: [1,3], [2,1] (sum=4). Group 2: [1,2] (sum=2)."
      },
      {
        input: "packages = [[1, 5], [2, 5], [3, 5]], max_priority = 5",
        output: "3",
        explanation: "Each package must be in its own group because any combination would exceed max_priority."
      }
    ],
    constraints: [
      "1 <= packages.length <= 10^5",
      "1 <= destination <= 10^4",
      "1 <= priority <= max_priority <= 100"
    ],
    edgeCases: [
      "Empty packages array",
      "All packages have the same destination",
      "Packages with max possible priority"
    ],
    hints: [
      "Consider grouping packages by destination first.",
      "You might want to sort the packages or use a greedy approach to bin packing.",
      "Since no two packages in a group can have the same destination, the minimum groups is at least the maximum frequency of any destination."
    ],
    starterCode: {
      Python: "def solve(packages, max_priority):\n    # Write your solution here\n    pass",
      Java: "class Solution {\n    public int solve(int[][] packages, int maxPriority) {\n        // Write your solution here\n        return 0;\n    }\n}",
      'C++': "class Solution {\npublic:\n    int solve(vector<vector<int>> packages, int maxPriority) {\n        // Write your solution here\n        return 0;\n    }\n};",
      JavaScript: "function solve(packages, maxPriority) {\n    // Write your solution here\n    return 0;\n}",
      TypeScript: "function solve(packages: number[][], maxPriority: number): number {\n    // Write your solution here\n    return 0;\n}",
      'C#': "public class Solution {\n    public int Solve(int[][] packages, int maxPriority) {\n        // Write your solution here\n        return 0;\n    }\n}",
      Go: "package main\n\nfunc solve(packages [][]int, maxPriority int) int {\n    // Write your solution here\n    return 0\n}",
      Rust: "fn solve(packages: Vec<Vec<i32>>, max_priority: i32) -> i32 {\n    // Write your solution here\n    return 0;\n}",
      Kotlin: "class Solution {\n    fun solve(packages: Array<IntArray>, maxPriority: Int): Int {\n        // Write your solution here\n        return 0\n    }\n}",
      PHP: "class Solution {\n    function solve($packages, $maxPriority) {\n        // Write your solution here\n        return 0;\n    }\n}",
      Swift: "class Solution {\n    func solve(_ packages: [[Int]], _ maxPriority: Int) -> Int {\n        // Write your solution here\n        return 0\n    }\n}"
    },
    testCases: [
      { input: "[[1, 3], [2, 1], [1, 2]], 5", expectedOutput: "2" },
      { input: "[[1, 5], [2, 5], [3, 5]], 5", expectedOutput: "3" }
    ]
  },
  {
    id: "p2",
    title: "Suspicious Login Detection",
    difficulty: "Easy",
    category: "Cybersecurity",
    tags: ["Strings", "Hash Map", "Data Processing"],
    roles: ["Backend Developer", "Data Scientist"],
    caseStudy: "A fintech app is experiencing credential stuffing attacks. The security team needs a module to analyze login attempt logs and flag IP addresses that exceed a certain failure threshold within a short time frame.",
    description: "Given a list of login attempts, where each attempt is formatted as 'IP_ADDRESS STATUS', return a list of IP addresses that have 3 or more 'FAILED' attempts.",
    inputFormat: "logs: Array of Strings. Each string is 'IP STATUS', where STATUS is 'SUCCESS' or 'FAILED'.",
    outputFormat: "Return an array of Strings representing the flagged IP addresses, sorted lexicographically.",
    examples: [
      {
        input: "logs = ['192.168.1.1 FAILED', '10.0.0.1 SUCCESS', '192.168.1.1 FAILED', '192.168.1.1 FAILED']",
        output: "['192.168.1.1']",
        explanation: "192.168.1.1 failed 3 times, so it is flagged. 10.0.0.1 succeeded."
      }
    ],
    constraints: [
      "1 <= logs.length <= 10^5",
      "IP addresses are valid IPv4 addresses."
    ],
    edgeCases: [
      "An IP has exactly 3 failures but interspersed with successes.",
      "No IP reaches 3 failures."
    ],
    hints: [
      "Use a hash map to keep track of the failed attempt counts for each IP.",
      "Iterate through the logs, parse the IP and status.",
      "At the end, collect all IPs with count >= 3 and sort them."
    ],
    starterCode: {
      Python: "def solve(logs):\n    # Write your solution here\n    pass",
      Java: "import java.util.*;\n\nclass Solution {\n    public List<String> solve(String[] logs) {\n        // Write your solution here\n        return new ArrayList<>();\n    }\n}",
      'C++': "#include <vector>\n#include <string>\n\nclass Solution {\npublic:\n    std::vector<std::string> solve(std::vector<std::string>& logs) {\n        // Write your solution here\n        return {};\n    }\n};",
      JavaScript: "function solve(logs) {\n    // Write your solution here\n    return [];\n}",
      TypeScript: "function solve(logs: string[]): string[] {\n    // Write your solution here\n    return [];\n}",
      'C#': "using System.Collections.Generic;\n\npublic class Solution {\n    public IList<string> Solve(string[] logs) {\n        // Write your solution here\n        return new List<string>();\n    }\n}",
      Go: "package main\n\nfunc solve(logs []string) []string {\n    // Write your solution here\n    return []string{}\n}",
      Rust: "fn solve(logs: Vec<String>) -> Vec<String> {\n    // Write your solution here\n    return vec![];\n}",
      Kotlin: "class Solution {\n    fun solve(logs: Array<String>): List<String> {\n        // Write your solution here\n        return listOf()\n    }\n}",
      PHP: "class Solution {\n    function solve($logs) {\n        // Write your solution here\n        return [];\n    }\n}",
      Swift: "class Solution {\n    func solve(_ logs: [String]) -> [String] {\n        // Write your solution here\n        return []\n    }\n}"
    },
    testCases: [
      { input: "['192.168.1.1 FAILED', '10.0.0.1 SUCCESS', '192.168.1.1 FAILED', '192.168.1.1 FAILED']", expectedOutput: "['192.168.1.1']" }
    ]
  },
  {
    id: "p3",
    title: "Hospital Appointment Overlap",
    difficulty: "Medium",
    category: "Healthcare",
    tags: ["Arrays", "Sorting", "Greedy"],
    roles: ["Backend Developer", "General Software"],
    caseStudy: "A hospital uses a scheduling system where doctors have multiple appointments. We need to analyze the day's schedule to find the minimum number of examination rooms required so that no two overlapping appointments are forced to share a room.",
    description: "You are given a 2D array of appointments where each appointment is represented by a start time and an end time. Your task is to compute the minimum number of examination rooms needed to host all appointments.",
    inputFormat: "appointments: Array of [start, end]. times are integers representing minutes from 00:00.",
    outputFormat: "Return an integer representing the minimum number of rooms required.",
    examples: [
      {
        input: "appointments = [[0, 30], [5, 10], [15, 20]]",
        output: "2",
        explanation: "Room 1: [0, 30]. Room 2: [5, 10] then [15, 20]. Minimum rooms needed is 2."
      }
    ],
    constraints: [
      "0 <= appointments.length <= 10^4",
      "0 <= start < end <= 10^6"
    ],
    edgeCases: [
      "Zero appointments",
      "All appointments overlap exactly",
      "No overlapping appointments"
    ],
    hints: [
      "Think about processing the start times and end times independently.",
      "Sort the start times and end times. Use two pointers to iterate.",
      "If a start time is smaller than the current end time, a new room is needed."
    ],
    starterCode: {
      Python: "def solve(appointments):\n    # Write your solution here\n    pass",
      Java: "class Solution {\n    public int solve(int[][] appointments) {\n        // Write your solution here\n        return 0;\n    }\n}",
      'C++': "class Solution {\npublic:\n    int solve(vector<vector<int>> appointments) {\n        // Write your solution here\n        return 0;\n    }\n};",
      JavaScript: "function solve(appointments) {\n    // Write your solution here\n    return 0;\n}"
    },
    testCases: [
      { input: "[[0, 30], [5, 10], [15, 20]]", expectedOutput: "2" }
    ]
  }
];
