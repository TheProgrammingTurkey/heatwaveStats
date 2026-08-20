async function loadCSV(url) {
    const res = await fetch(url);
    const text = await res.text();
    return parseCSV(text);
}

function parseCSV(text) {
  const rows = text.trim().split(/\r?\n/);
  return rows.map(row => row.split(","));
}

async function init() {
    const teamIDs = await loadCSV("ids.csv");
    const gameLogs = await loadCSV("data.csv");
    rankTeamsByWinPercentage(teamIDs, gameLogs);
}

init();

async function allTimeRecord(games, team){
    let wins = 0;
    let losses = 0;
    games.forEach(game => {
        if(team.includes(game[1])){
            if(parseInt(game[3]) > parseInt(game[4])){
                wins++;
            } else {
                losses++;
            }
        }

        if(team.includes(game[2])){
            if(parseInt(game[4]) > parseInt(game[3])){
                wins++;
            } else {
                losses++;
            }
        }
    });
    let winPercentage = Math.round((wins/(wins+losses))*1000)/1000;
    return [team[0], wins, losses, winPercentage]
}

async function rankTeamsByWinPercentage(teamIDs, gameLogs){
    let bronzeStats = [];
    let silverStats = [];
    let goldStats = [];
    let platinumStats = [];
    let naStats = [];
    for (const team of teamIDs) {
        if(team[1] == "Bronze"){
            bronzeStats.push(await allTimeRecord(gameLogs, team));
        }
        else if(team[1] == "Silver"){
            silverStats.push(await allTimeRecord(gameLogs, team));
        }
        else if(team[1] == "Gold"){
            goldStats.push(await allTimeRecord(gameLogs, team));
        }
        else if(team[1] == "Platinum"){
            platinumStats.push(await allTimeRecord(gameLogs, team));
        }
        else if(team[1] == "N/A"){
            naStats.push(await allTimeRecord(gameLogs, team));
        }
        console.log((teamIDs.indexOf(team)+1) + " Out of " + teamIDs.length + " Teams Done");
    }

    bronzeStats.sort((a, b) => {
        return b[3] - a[3];
    });
    silverStats.sort((a, b) => {
        return b[3] - a[3];
    });
    goldStats.sort((a, b) => {
        return b[3] - a[3];
    });
    platinumStats.sort((a, b) => {
        return b[3] - a[3];
    });
    naStats.sort((a, b) => {
        return b[3] - a[3];
    });

    const statsByTier = {
        naRecords: naStats,
        platinumRecords: platinumStats,
        goldRecords: goldStats,
        silverRecords: silverStats,
        bronzeRecords: bronzeStats
    };

    Object.entries(statsByTier).forEach(([tableId, teams]) => {
        const tableBody = document.getElementById(tableId);
        tableBody.replaceChildren();

        teams.forEach(team => {
            const row = document.createElement("tr");
            [team[0], team[1], team[2], team[3]].forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });
            tableBody.appendChild(row);
        });
    });
}
