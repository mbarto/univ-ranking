import fetch from "sync-fetch"
import { Parser } from "json2csv"
import fs from "fs"
import jsdom from "jsdom"
const { JSDOM } = jsdom

if (process.argv.length >= 2) {
    console.log("Fetching per Archive...")
    fetchArchives()
} else {
    paramsError()
}
function saveArchives(outputFile, rows) {
    const output = fs.openSync(outputFile, "w")
    const fields = [
        "world_rank",
        "institution",
        "country",
        "national_regional_rank",
        "total_enrollment",
        "graduate_enrollment",
        "undergraduate_enrollment",
        "total_score",
        "alumni_score",
        "award_score",
        "hici_score",
        "ns_score",
        "pub_score",
        "pcp_score"
    ]
    let parser = new Parser({
        fields,
    })
    fs.writeSync(output, parser.parse([]) + "\n")
    parser = new Parser({
        fields,
        header: false,
    })
    rows.forEach(function(row) {
        fs.writeSync(
            output,
            parser.parse([
                row,
            ]) + "\n",
        )
    })
    
}
function fetchArchives() {
    const years = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020]
    try {
        years.forEach(function(y) {
            const body = asDom(fetchArchive(y));
            const rows = [...body.querySelectorAll("table tr")]
            const [_,...dataRows] = rows
            const institutions = dataRows.map((r, idx) => getInstitutionData(r, y, idx))
            const processed = dataRows.map((r, idx) => buildRow(r, institutions[idx]))
            saveArchives(`archives/${y}.csv`, processed)
        })
        console.log("Terminated successfully!")
    } catch(e) {
        console.error(e.message)
    }
}

function getInstitutionData(row, year, idx) {
    try {
        const cell = row.querySelectorAll("td")[1]
        console.log("Fetching institutions data for " + getInstitution(cell))
        const html = fs.readFileSync(`institutions/${year}_${idx}.html`, { encoding: "UTF8" })
        const body = asDom(html)
        const tab = body.querySelector("#tab3 p")
        if (tab && tab.textContent) {
            return {
                total_enrollment: getFromTab(tab.textContent, "Total"),
                undergraduate_enrollment: getFromTab(tab.textContent, "Undergraduate"),
                graduate_enrollment: getFromTab(tab.textContent, "Graduate"),
            }
        }
        
    } catch(e) {
        console.error(`Error getting institutional data for ${year}_${idx}`)
    }
    return {
        total_enrollment: "-1",
        undergraduate_enrollment: "-1",
        graduate_enrollment: "-1",
    }
}

function getFromTab(tab, label) {
    const searchValue = new RegExp(".*?" + label + ".*?:([0-9]+).*?$")
    if (tab.match(searchValue))
        return tab.replace(searchValue, "$1");
    return "-1"
}

function buildRow(tableRow, institution) {
    const cells = [...tableRow.querySelectorAll("td")]
    return {
        world_rank: getWorldRank(cells[0]),
        institution: getInstitution(cells[1]),
        country: getCountry(cells[2]),
        national_regional_rank: getNationalRank(cells[3]),
        total_enrollment: institution.total_enrollment,
        graduate_enrollment: institution.graduate_enrollment,
        undergraduate_enrollment: institution.undergraduate_enrollment,
        total_score: getScore(cells[4]),
        alumni_score: getScore(cells[5]),
        award_score: getScore(cells[6]),
        hici_score: getScore(cells[7]),
        ns_score: getScore(cells[8]),
        pub_score: getScore(cells[9]),
        pcp_score: getScore(cells[10])
    }
}

function getWorldRank(cell) {
    return cell.textContent
}

function getInstitution(cell) {
    return cell.querySelector("a").textContent
}

function getCountry(cell) {
    const imgSrc = cell.querySelector("img").src
    const imgTitle = cell.querySelector("a").title
    if (imgTitle.indexOf("View universities in ") === 0)
        return imgTitle.substring("View universities in ".length, imgTitle.length -1)
    return imgSrc.substring(imgSrc.lastIndexOf('/') + 1).split(".")[0]
}

function getNationalRank(cell) {
    return cell.querySelector("div").textContent
}

function getScore(cell) {
    if (cell.querySelector("div"))
        return Number(cell.querySelector("div").textContent)
        return Number(cell.textContent)
}

function fetchArchive(year) {
    console.log(`Fetching ${year}...`)
    return fetch(`http://archive.shanghairanking.com/ARWU${year}.html`).text()
}

function paramsError() {
    console.error("node ./fetch_archives.mjs")
}

function asDom(text) {
    return JSDOM.fragment(text)
}
