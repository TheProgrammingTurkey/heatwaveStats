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
    if(team) return team[0];

    console.warn("Unknown team ID:", id);
    return `Unknown team (${id})`;
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
        if(team.includes(game[2])){
            if(parseInt(game[4]) > parseInt(game[5])){
                wins++;
            } else {
                losses++;
            }
        }

        if(team.includes(game[3])){
            if(parseInt(game[5]) > parseInt(game[4])){
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
    let season = "";
    let seasonResults = [];
    const teamVsTeamBlock = document.getElementById("teamVsTeam");
    const overallRecord = teamVsTeamBlock.getElementsByClassName("overallRecord")[0];
    const headings = overallRecord.getElementsByTagName("h2");
    const paragraphs = overallRecord.getElementsByTagName("p");
    const resultsHeading = teamVsTeamBlock.getElementsByTagName("h2")[2];
    const resultsTable = teamVsTeamBlock.getElementsByTagName("table")[0];
    const tableBody = teamVsTeamBlock.getElementsByClassName("historicalResults")[0];
    tableBody.replaceChildren();

    headings[1].textContent = "Overall Goals For vs Goals Against";
    resultsHeading.textContent = "All Time Results";
    resultsHeading.hidden = false;
    resultsTable.hidden = false;

    // Check both home/away arrangements so the matchup is order-independent.
    games.forEach(game => {
        if(game[0] !== season){
            if(season !== "" && seasonResults.length > 0){
                gameLogs.push({ type: "season", season });
                gameLogs.push(...seasonResults);
            }
            season = game[0];
            seasonResults = [];
        }

        if(team1.includes(game[2]) && team2.includes(game[3])){
            if(parseInt(game[4]) > parseInt(game[5])){
                team1Wins++;
                seasonResults.push({ type: "result", winner: team1[0], score: `${game[4]}-${game[5]}` });
            } else {
                team1Losses++;
                seasonResults.push({ type: "result", winner: team2[0], score: `${game[5]}-${game[4]}` });
            }
            team1Score+=parseInt(game[4]);
            team2Score+=parseInt(game[5]);
        }

        if(team1.includes(game[3]) && team2.includes(game[2])){
            if(parseInt(game[5]) > parseInt(game[4])){
                team1Wins++;
                seasonResults.push({ type: "result", winner: team1[0], score: `${game[5]}-${game[4]}` });
            } else {
                team1Losses++;
                seasonResults.push({ type: "result", winner: team2[0], score: `${game[4]}-${game[5]}` });
            }
            team1Score+=parseInt(game[5]);
            team2Score+=parseInt(game[4]);
        }
    });

    if(season !== "" && seasonResults.length > 0){
        gameLogs.push({ type: "season", season });
        gameLogs.push(...seasonResults);
    }

    if(gameLogs.length == 0){
        headings[1].textContent = `${team1[0]} has never played against ${team2[0]}`;
        paragraphs[0].textContent = "";
        paragraphs[1].textContent = "";
        resultsHeading.hidden = true;
        resultsTable.hidden = true;
        return;
    }
    paragraphs[0].textContent = team1[0] + " " + team1Wins + " - " + team1Losses + " " + team2[0];
    paragraphs[1].textContent = team1[0] + " " + team1Score + " - " + team2Score + " " + team2[0];
    gameLogs.forEach(game => {
        const row = document.createElement("tr");

        if(game.type === "season"){
            const curSeason = document.createElement("td");
            curSeason.colSpan = 2;
            curSeason.textContent = game.season;
            curSeason.classList.add("season-header");
            row.appendChild(curSeason);
        }
        else{
            const winningTeam = document.createElement("td");
            winningTeam.textContent = game.winner;
            const scoreLine = document.createElement("td");
            scoreLine.textContent = game.score;
            row.appendChild(winningTeam);
            row.appendChild(scoreLine);
        }

        tableBody.appendChild(row);
    });
}

async function teamResultsHistory(team, teamIDs, games){
    let gameLogs = [];
    let wins = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let season = "";
    let seasonResults = [];

    // Count a win or loss whenever this team appears in a completed game.
    games.forEach(game => {
        if(game[0] !== season){
            if(season !== "" && seasonResults.length > 0){
                gameLogs.push({ type: "season", season });
                gameLogs.push(...seasonResults);
            }
            season = game[0];
            seasonResults = [];
        }

        if(team.includes(game[2])){
            if(parseInt(game[4]) > parseInt(game[5])){
                wins++;
                seasonResults.push({ type: "result", winner: team[0], score: `${game[4]}-${game[5]}`});
            } else {
                losses++;
                seasonResults.push({ type: "result", winner: teamNameFromId(teamIDs, game[3]), score: `${game[5]}-${game[4]}`});
            }
            goalsFor+=parseInt(game[4]);
            goalsAgainst+=parseInt(game[5]);
        }

        if(team.includes(game[3])){
            if(parseInt(game[5]) > parseInt(game[4])){
                wins++;
                seasonResults.push({ type: "result", winner: team[0], score: `${game[5]}-${game[4]}`});
            } else {
                losses++;
                seasonResults.push({ type: "result", winner: teamNameFromId(teamIDs, game[2]), score: `${game[4]}-${game[5]}`});
            }
            goalsFor+=parseInt(game[5]);
            goalsAgainst+=parseInt(game[4]);
        }
    });

    if(season !== "" && seasonResults.length > 0){
        gameLogs.push({ type: "season", season });
        gameLogs.push(...seasonResults);
    }

    document.getElementById("teamResults").getElementsByClassName("overallRecord")[0].getElementsByTagName("p")[0].innerHTML = wins + " - " + losses;
    document.getElementById("teamResults").getElementsByClassName("overallRecord")[0].getElementsByTagName("p")[1].innerHTML = "GF " + goalsFor + " - " + goalsAgainst + " GA";
    const tableBody = document.getElementById("teamResults").getElementsByClassName("historicalResults")[0];
    tableBody.replaceChildren();

    gameLogs.forEach(game => {
        const row = document.createElement("tr");

        if(game.type === "season"){
            const curSeason = document.createElement("td");
            curSeason.colSpan = 2;
            curSeason.textContent = game.season;
            curSeason.classList.add("season-header");
            row.appendChild(curSeason);
        }
        else{
            const winningTeam = document.createElement("td");
            winningTeam.textContent = game.winner;
            const scoreLine = document.createElement("td");
            scoreLine.textContent = game.score;
            row.appendChild(winningTeam);
            row.appendChild(scoreLine);
        }

        tableBody.appendChild(row);
    });
}