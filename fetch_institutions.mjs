import fetch from "sync-fetch"
import fs from "fs"
import jsdom from "jsdom"
const { JSDOM } = jsdom

let type = "all"
if (process.argv.length >= 2) {
    if (process.argv.length >= 3) {
        type = process.argv[2].toLowerCase()
    }
    switch (type) {
        case "all": {
            fetchInstitutions(false)
            break;
        }
        case "missing": {
            fetchInstitutions(true)
            break;
        }
        default: {
            paramsError()
        }
    }
} else {
    paramsError()
}

function save(outputFile, body) {
    console.log(`Saving to ${outputFile}...`)
    fs.writeFileSync(outputFile, body)
}

function fetchInstitutions(onlyMissing) {
    const years = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020]
    try {
        years.forEach(function(y) {
            const body = asDom(fetchArchive(y));
            const rows = [...body.querySelectorAll("table tr")]
            const [_,...dataRows] = rows
            dataRows.forEach((r, idx) => getInstitutionPage(r, idx, y, onlyMissing))
        })
        console.log("Terminated successfully!")
    } catch(e) {
        console.error(e.message)
    }
}

function getInstitutionPage(row, idx, year, onlyMissing) {
    try {
        const fileName = `institutions/${year}_${idx}.html`
        if (!onlyMissing  || !fs.existsSync(fileName)) {
            const cell = row.querySelectorAll("td")[1]
            const institution = getInstitution(cell)
            const page = encodeURIComponent(cell.querySelector("a").href)
            console.log(`Fetching institutions data for ${institution} (${page})`)
            const body = fetch(`http://archive.shanghairanking.com/${page}`).text()
            save(fileName, body)
        }
        
    } catch(e) {
        console.error(`Error fetching ${year}_${idx}: ${e.message}`)
    }
    
}

function getInstitution(cell) {
    return cell.querySelector("a").textContent
}

function fetchArchive(year) {
    console.log(`Fetching ${year}...`)
    return fetch(`http://archive.shanghairanking.com/ARWU${year}.html`).text()
}

function paramsError() {
    console.error("node ./fetch_institutions.mjs [all|missing]")
}

function asDom(text) {
    return JSDOM.fragment(text)
}
