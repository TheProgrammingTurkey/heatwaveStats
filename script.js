async function loadCSV(url) {
    // Fetch a CSV file from the same folder as the webpage.
    const res = await fetch(url);
    const text = await res.text();
    return parseCSV(text);
}

function parseCSV(text) {
    // Convert each CSV line into an array of column values.
    const rows = text.trim().split(/\r?\n/);
    return rows.map(row => row.split(","));
}

function teamNameFromId(teamIDs, id) {
    const team = teamIDs.find(row => row.slice(2).includes(String(id)));
    return team ? team[0] : "Unknown team";
}

function populateTeamSelect(select, teamIDs, excludedIndex, selectedIndex) {
    select.replaceChildren();

    const teams = teamIDs.slice(1)
        .map((team, index) => ({ team, teamIndex: index + 1 }))
        .filter(({ teamIndex }) => teamIndex !== excludedIndex)
        .sort((a, b) => a.team[0].localeCompare(b.team[0]));

    teams.forEach(({ team, teamIndex }) => {
        const option = document.createElement("option");
        option.value = teamIndex;
        option.textContent = team[0];
        select.appendChild(option);
    });

    const selectedOption = [...select.options].find(option => option.value === String(selectedIndex));
    select.value = selectedOption ? String(selectedIndex) : select.options[0]?.value;
}

async function initStandings() {
    const teamIDs = await loadCSV("ids.csv");
    const gameLogs = await loadCSV("data.csv");
    rankTeamsByWinPercentage(teamIDs, gameLogs);
}

async function initTeamData() {
    const teamIDs = await loadCSV("ids.csv");
    const gameLogs = await loadCSV("data.csv");
    const teamSelect = document.getElementById("selectedTeam");
    const opponentSelect = document.getElementById("opponentTeam");
    let selectedTeamIndex = 7;
    let opponentIndex = 5;

    populateTeamSelect(teamSelect, teamIDs, null, selectedTeamIndex);
    populateTeamSelect(opponentSelect, teamIDs, selectedTeamIndex, opponentIndex);

    const updateTeamData = () => {
        const selectedTeam = teamIDs[selectedTeamIndex];
        teamResultsHistory(selectedTeam, teamIDs, gameLogs);
        teamVSteam(gameLogs, selectedTeam, teamIDs[opponentIndex]);
    };

    teamSelect.addEventListener("change", () => {
        selectedTeamIndex = Number(teamSelect.value);
        populateTeamSelect(opponentSelect, teamIDs, selectedTeamIndex, opponentIndex);
        opponentIndex = Number(opponentSelect.value);
        updateTeamData();
    });

    opponentSelect.addEventListener("change", () => {
        opponentIndex = Number(opponentSelect.value);
        updateTeamData();
    });

    updateTeamData();
}

async function allTimeRecord(games, team){
    let wins = 0;
    let losses = 0;
    // Count a win or loss whenever this team appears in a completed game.
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
    return [team[0], wins, losses, winPercentage];
}

async function rankTeamsByWinPercentage(teamIDs, gameLogs){
    let bronzeStats = [];
    let silverStats = [];
    let goldStats = [];
    let platinumStats = [];
    let naStats = [];
    // Calculate each team once and place it in the matching division.
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

    // Sort every division from highest to lowest win percentage.
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

    // Match each stats array to the tbody ID in index.html.
    const statsByTier = {
        naRecords: naStats,
        platinumRecords: platinumStats,
        goldRecords: goldStats,
        silverRecords: silverStats,
        bronzeRecords: bronzeStats
    };

    // Create the table rows in the browser; index.html only needs empty tbodies.
    Object.entries(statsByTier).forEach(([tableId, teams]) => {
        const tableBody = document.getElementById(tableId);
        tableBody.replaceChildren();

        teams.forEach(team => {
            // Use textContent instead of HTML strings so team names are treated as text.
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

async function teamVSteam(games, team1, team2){
    let gameLogs = [];
    let team1Wins = 0;
    let team1Losses = 0;
    let team1Score = 0;
    let team2Score = 0;
    const teamVsTeamBlock = document.getElementById("teamVsTeam");
    const overallRecord = teamVsTeamBlock.getElementsByClassName("overallRecord")[0];
    const headings = overallRecord.getElementsByTagName("h2");
    const paragraphs = overallRecord.getElementsByTagName("p");
    const tableBody = teamVsTeamBlock.getElementsByClassName("historicalResults")[0];
    tableBody.replaceChildren();

    headings[1].textContent = "Overall Goals For vs Goals Against";
    teamVsTeamBlock.getElementsByTagName("h2")[2].textContent = "All Time Results";

    // Check both home/away arrangements so the matchup is order-independent.
    games.forEach(game => {
        let gameWinner = "";
        if(team1.includes(game[1]) && team2.includes(game[2])){
            if(parseInt(game[3]) > parseInt(game[4])){
                team1Wins++;
                gameLogs.push([team1[0], game[3], game[4]]);
            } else {
                team1Losses++;
                gameWinner = team2[0];
                gameLogs.push([team2[0], game[4], game[3]]);
            }
            team1Score+=parseInt(game[3]);
            team2Score+=parseInt(game[4]);
        }

        if(team1.includes(game[2]) && team2.includes(game[1])){
            if(parseInt(game[4]) > parseInt(game[3])){
                team1Wins++;
                gameLogs.push([team1[0], game[4], game[3]]);
            } else {
                team1Losses++;
                gameLogs.push([team2[0], game[3], game[4]]);
            }
            team1Score+=parseInt(game[4]);
            team2Score+=parseInt(game[3]);
        }
    });
    if(gameLogs.length == 0){
        headings[1].textContent = `${team1[0]} has never played against ${team2[0]}`;
        paragraphs[0].textContent = "";
        paragraphs[1].textContent = "";
        teamVsTeamBlock.getElementsByTagName("h2")[2].textContent = "All Time Results";
        return;
    }
    paragraphs[0].textContent = team1[0] + " " + team1Wins + " - " + team1Losses + " " + team2[0];
    paragraphs[1].textContent = team1[0] + " " + team1Score + " - " + team2Score + " " + team2[0];
    gameLogs.forEach(game => {
        const row = document.createElement("tr");
        const winningTeam = document.createElement("td")
        winningTeam.textContent = game[0];
        const scoreLine = document.createElement("td")
        scoreLine.textContent = game[1]+"-"+game[2];
        row.appendChild(winningTeam);
        row.appendChild(scoreLine);
        tableBody.appendChild(row);
    });
}

async function teamResultsHistory(team, teamIDs, games){
    let gameLogs = [];
    let wins = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    // Count a win or loss whenever this team appears in a completed game.
    games.forEach(game => {
        if(team.includes(game[1])){
            if(parseInt(game[3]) > parseInt(game[4])){
                wins++;
                gameLogs.push([team[0], game[3], game[4]]);
            } else {
                losses++;
                gameLogs.push([teamNameFromId(teamIDs, game[2]), game[4], game[3]]);
            }
            goalsFor+=parseInt(game[3]);
            goalsAgainst+=parseInt(game[4]);
        }

        if(team.includes(game[2])){
            if(parseInt(game[4]) > parseInt(game[3])){
                wins++;
                gameLogs.push([team[0], game[4], game[3]]);
            } else {
                losses++;
                gameLogs.push([teamNameFromId(teamIDs, game[1]), game[3], game[4]]);
            }
            goalsFor+=parseInt(game[4]);
            goalsAgainst+=parseInt(game[3]);
        }
    });
    document.getElementById("teamResults").getElementsByClassName("overallRecord")[0].getElementsByTagName("p")[0].innerHTML = wins + " - " + losses;
    document.getElementById("teamResults").getElementsByClassName("overallRecord")[0].getElementsByTagName("p")[1].innerHTML = "GF " + goalsFor + " - " + goalsAgainst + " GA";
    const tableBody = document.getElementById("teamResults").getElementsByClassName("historicalResults")[0];
    tableBody.replaceChildren();

    gameLogs.forEach(game => {
        const row = document.createElement("tr");
        const winningTeam = document.createElement("td")
        winningTeam.textContent = game[0];
        const scoreLine = document.createElement("td")
        scoreLine.textContent = game[1]+"-"+game[2];
        row.appendChild(winningTeam);
        row.appendChild(scoreLine);
        tableBody.appendChild(row);
    });
}