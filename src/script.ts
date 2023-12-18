import {wordsLengthFive as wordList} from "./wordsLengthFiveLong";

let wordListFiltered = wordList;
// let ratedWordListFiltered = wordList.map(word => ({word: word, rating: 0} as RatedWord))

function cycleFilter(currentFilter: string): string {
    const keys = Object.keys(FilterType)
    return FilterType[(keys.indexOf(currentFilter.toString()) + 1) % (keys.length / 2)];
}

enum FilterType {
    NO_FILTER,
    WRONG_POSITION,
    RIGHT_POSITION,
    NOT_IN_WORD
}

function Filter(filterType: string) {
    const filterFunction = function(word: string, letter:string, position: number): boolean {
        switch (filterType) {
            case "NOT_IN_WORD":
                return !word.includes(letter);
            case "WRONG_POSITION":
                return word.includes(letter) && word.charAt(position) != letter;
            case "RIGHT_POSITION":
                return word.charAt(position) == letter;
            default:
                return true;
        }
    }
    return filterFunction;
}

interface GuessLetter {
    position: number,
    letter: string,
    filter: string
}

let guesses: Array<GuessLetter> = [...Array(5*6).keys()].map(i => {
    return {position:i, letter: "", filter:"NO_FILTER"}
});

function createLetterRow(length: number): HTMLElement {
    const element = document.createElement("div");
    element.className = "letter-row";
    return element
}

function createLetterBox(letter: string, type: string): HTMLElement {
    const element = document.createElement(type);
    element.className = "letter-box";
    element.innerHTML = letter;
    return element;
}

let inputDiv : HTMLElement = document.getElementById("input") ?? document.createElement("div");

for (let i = 0; i < 6; i++) {
    const letterRow = createLetterRow(5);
    for (let j = 0; j < 5; j++) {
        const letterBox = createLetterBox(" ", "input") as HTMLInputElement;
        letterBox.dataset.filter = FilterType[FilterType.NO_FILTER]
        letterBox.dataset.position = (i * 5 + j).toString();
        letterBox.maxLength = 1;
        letterBox.oninput = (event) => {
            if (event.target) {
                const target = event.target as HTMLInputElement;
                updateGuesses(target);
            }
            filterWordList()
        }
        
        // letterBox.dataset.filter = "";
        // letterBox.onkeyup = (event) => {
        //     const target = event.target as HTMLElement;
        //     console.log(event.key)
        //     if (event.key == "Backspace") {
        //         const previous = target.previousSibling as HTMLElement;
        //         previous.focus();
        //     }
            
        //     if ("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".indexOf(event.key) != -1) {
        //         const next = target.nextSibling as HTMLElement;
        //         filterWordList()
        //         next.focus();
        //     }
        // }
        letterBox.onclick = (event) => {
            const target = event.target as HTMLInputElement;
            target.dataset.filter = cycleFilter(target.dataset.filter ?? FilterType[FilterType.NO_FILTER])
            updateGuesses(target);
            filterWordList()
        }
        letterRow.appendChild(letterBox);
    }
    inputDiv.appendChild(letterRow)
    filterWordList()
   
}

function updateGuesses(letterBox: HTMLInputElement) {
    if (letterBox.dataset.position) {
        const position = parseInt(letterBox.dataset.position);
        guesses[position].position = position;
        guesses[position].letter = letterBox.value.toLowerCase();
        guesses[position].filter = letterBox.dataset.filter ?? FilterType[FilterType.NO_FILTER]
    }
}

function updateShownWordList() {
    let outputDiv : HTMLElement = document.getElementById("output") ?? document.createElement("div");
    outputDiv.innerHTML = wordListFiltered.length.toString()
    wordListFiltered.slice(0, 20).forEach(element => {
        const letterRow = createLetterRow(5);
        element.split("").forEach(letter => {
            letterRow.appendChild(createLetterBox(letter, "div"));
        });
        outputDiv.appendChild(letterRow)
    });
    
}

function filterWordList() {
    wordListFiltered = wordList;
    for (const guess of guesses) {
        const filter = Filter(guess.filter)
        wordListFiltered = wordListFiltered.filter((word) => filter(word, guess.letter, guess.position % 5));      
    }
    updateShownWordList();
}

// function filterWordList2() {
//     wordListFiltered = wordList;
//     for (const row of inputDiv.childNodes) {
//         row.childNodes.forEach((cell, i) => {
//             if (cell instanceof HTMLInputElement) {
//                 const filter = Filter(cell.dataset.filter ?? "")
//                 wordListFiltered = wordListFiltered.filter((word) => filter(word, cell.value, i));
//             }               
//         });            
//     }
//     display();
// }