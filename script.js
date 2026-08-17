const fs = require("fs");
const path = require("path");

let seasonIDs = [6847, 7626, 8167, 8597, 9030, 9449, 9915, 10397, 10680];
let teamID = 16; //Doom Penguins
let teamIDs = readCSV("stats.csv");
let ticket = "iQmkdzMKtcyCXvxeYUZrcsDu-Owi2fJH6VHSbFje2MTRFawfAXkyFwPr3PEBcuDnArt3EuDcY19qEsAOkjV6mqJr";

function readCSV(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist.");
    }
    if (path.extname(filePath) !== '.csv') {
      throw new Error("Not a CSV file.");
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const rows = data.split(/\r?\n/).map(row => row.split(','));
    rows.shift()
    return rows;
  } catch (err) {
    console.error("Error reading CSV:", err.message);
  }
}

async function allTimeRecord(team){
    let wins = 0;
    let losses = 0;

    for(const id of seasonIDs){
        const response = await fetch(`https://stats.api.digitalshift.ca/season/${id}/games?fieldset=admin_schedule`, {
            headers: {
                "authorization": `ticket="${ticket}"`
            }
        });

        const data = await response.json();
        const games = data.games;
        games.forEach(game => {
            if (game.status === "Not Started") return;

            if(game.home_team_id == team[seasonIDs.indexOf(id)+2]){
                if(game.stats.home_score > game.stats.away_score){
                    wins++;
                } else {
                    losses++;
                }
            }

            if(game.away_team_id == team[seasonIDs.indexOf(id)+2]){
                if(game.stats.away_score > game.stats.home_score){
                    wins++;
                } else {
                    losses++;
                }
            }
        });
    }

    let winPercentage = Math.round((wins/(wins+losses))*1000)/1000;
    // winPercentage = Math.round((wins/(wins+losses))*1000)/1000 + "";
    // if(winPercentage[0] == "0"){
    //     winPercentage = winPercentage.slice(1);
    // }

    // return team[0] + " Record: " + wins + "-" + losses + " With a " + winPercentage + " Win Percentage";
    return [team[0], wins, losses, winPercentage]
}

(async () => {
    let bronzeStats = [];
    let silverStats = [];
    let goldStats = [];
    let platinumStats = [];
    for (const team of teamIDs) {
        if(team[1] == "Bronze"){
            bronzeStats.push(await allTimeRecord(team));
        }
        else if(team[1] == "Silver"){
            silverStats.push(await allTimeRecord(team));
        }
        else if(team[1] == "Gold"){
            goldStats.push(await allTimeRecord(team));
        }
        else if(team[1] == "Platinum"){
            platinumStats.push(await allTimeRecord(team));
        }
        console.log("Team " + teamIDs.indexOf(team) + " Out of " + teamIDs.length);
    }
    // console.log(bronzeStats);
    // console.log(silverStats);
    // console.log(goldStats);
    // console.log(platinumStats);

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


    console.log(bronzeStats);
    console.log(silverStats);
    console.log(goldStats);
    console.log(platinumStats);

})();
