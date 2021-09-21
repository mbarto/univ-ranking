import fetch from "sync-fetch"
import { Parser } from "json2csv"
import fs from "fs"
import puppeteer from "puppeteer"
import jsdom from "jsdom"
const { JSDOM } = jsdom

if (process.argv.length >= 2) {
    console.log("Fetching per Subject...")
    fetchSubjects()
} else {
    paramsError()
}

async function fetchSubjects() {
    const years = [2017, 2018, 2019, 2020]
    for (const year of years) {
        const rows = await fetchSubject(year)
        saveSubjects(`subjects/${year}.csv`, rows)
    }
}

function saveSubjects(outputFile, rows) {
    const output = fs.openSync(outputFile, "w")
    const fields = [
        "world_rank",
        "institution",
        "country_code",
        "total_score",
        "q1_pub_score",
        "cnci_score",
        "ic_score",
        "top_score",
        "award_score"
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

async function addScores(rows, page) {
    let newRows = rows;
    const scores = ["cnci_score", "ic_score", "top_score", "award_score"]
    for (let i = 0; i < scores.length; i++) {
        newRows = await addScore(newRows, i + 2, scores[i], page)
    }
    return newRows
}

async function addScore(rows, offset, score, page) {
    try {
        await page.click(".rk-table th:nth-child(5) .rank-select .inputWrapper")
        await page.click(`.rk-table th:nth-child(5) .rank-select .options li:nth-child(${offset})`)
        const newBody = await page.evaluate(() => {
            return document.body.innerHTML
        })
        const newRows = [...asDom(newBody).querySelectorAll("table tbody tr")]
        
        return rows.map((r, idx) => {
            return {
                ...r,
                [score]: getScore(newRows[idx].querySelectorAll("td")[4])
            }
        })
    } catch(e) {
        console.error(e.message)
    }
    
}

async function fetchSubject(year) {
    console.log(`Fetching ${year}...`)
    const browser = await puppeteer.launch()
    try {
        const page = await browser.newPage()
        await page.goto(`http://www.shanghairanking.com/rankings/gras/${year}/RS0301`)
        let pageNum = 1
        let allRows = []
        while(pageNum <= 17)  {
            if (pageNum > 1) {
                await page.click(`.ant-pagination-item-${pageNum}`)
                await page.click(".rk-table th:nth-child(5) .rank-select .inputWrapper")
                await page.click(`.rk-table th:nth-child(5) .rank-select .options li:nth-child(1)`)
            }
            
            const body = asDom(await page.evaluate(() => {
                return document.body.innerHTML
            }))
            const rows = [...body.querySelectorAll("table tbody tr")]
            const dataRows = await addScores(rows.map(buildRow), page)
            allRows = [...allRows, ...dataRows]
            pageNum++
        }
        return allRows
        // await page.click(".ant-pagination-item-2") pages 1 - 17
        /*await page.click(".rk-table th:nth-child(5) .rank-select .inputWrapper")
        await page.click(".rk-table th:nth-child(5) .rank-select .options li:nth-child(2)")
        const body2 = await page.evaluate(() => {
            return document.body.innerHTML
        })
        return [body1, body2]*/
    } catch(e) {
        console.error(e.message)
    } finally {
        await browser.close();
    }
}

function buildRow(tableRow) {
    const cells = [...tableRow.querySelectorAll("td")]
    return {
        world_rank: getWorldRank(cells[0]),
        institution: getInstitution(cells[1]),
        country_code: getCountry(cells[2]),
        total_score: getScore(cells[3]),
        q1_pub_score: getScore(cells[4])
    }
}

function getWorldRank(cell) {
    return cell.textContent.trim()
}

function getInstitution(cell) {
    if (cell.querySelector("a span"))
        return cell.querySelector("a span").textContent.trim()
    return cell.querySelector("span").textContent.trim()
}

function getCountry(cell) {
    const img = cell.querySelector("div").style.backgroundImage
    return img.substring(img.lastIndexOf("/") + 1, img.lastIndexOf("."))
}

function getScore(cell) {
    if (cell.querySelector("div"))
        return Number(cell.querySelector("div").textContent)
    if (cell)
        return Number(cell.textContent)
    return -1
}

function paramsError() {
    console.error("node ./fetch.mjs <subject|archive> <outputFile>")
}

function asDom(text) {
    return JSDOM.fragment(text)
}
