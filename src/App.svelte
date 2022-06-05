<script lang="ts">
	import { Filters } from './Filters';

	import { wordsLengthFive } from './wordsLengthFiveShort'

	let words: string[] = wordsLengthFive;
	let filteredWords: string[] = words;
	let displayedWords: string[];

	let wordLength = 5;
	let nrOfRows = 6;

	let letters: string[][] = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(""));
	let filters: Function[][] = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(Filters.noFilter));

   	// onMount(async () => {
    //     // const response = await fetch("https://github.com/mrtnnrdlnd/wurdalurd/blob/main/public/words.json");
	// 	const response = await fetch("words.json");
    //     words = await response.json() as string[];
	// 	filteredWords = words;
	// });
		// console.log(rateAlphabet(words))
	// let benchmarkResult = benchmark(words);
	// console.log(benchmarkResult);
	// console.log(average(benchmarkResult));

	console.log(ratedWords2(words, filteredWords));

	function average(numbers: number[]): number {
		let sum: number = 0;
		numbers.forEach((n) => sum += n);
		return sum / numbers.length;
	}

	function benchmark(words: string[]): number[] {
		let filteredWords;

		let randomWord: string;
		let guess: string;
		let attemts: number[] = [];

		for (let i = 0; i < 1000; i++) {
			filteredWords = words;
			randomWord = pickRandomWord(words);

			for (let attemt = 1; attemt <= 6; attemt++) {
				
				if (filteredWords.length > 0 && filteredWords.length <= 4) {
					// guess = [...ratedWords(filteredWords, filteredWords).keys()][0];
					guess = [...ratedWords2(filteredWords, filteredWords).keys()][0];
				}
				else if (filteredWords.length > 2000) {
					guess = "raise"
				}
				else if (filteredWords.length > 4) {
					// guess = [...ratedWords(words, filteredWords).keys()][0];
					guess = [...ratedWords2(words, filteredWords).keys()][0];
				}

				if (guess == randomWord) {
					attemts.push(attemt);
					break;
				}

				let filters: Function[] = new Array<Function>(words[0].length);

				guess.split("").forEach((letter, i) => {
					if (randomWord.charAt(i) == letter) {
						filters[i] = Filters.rightPosition;
					}
					if (!randomWord.includes(letter)) {
						filters[i] = Filters.notInWord;
					}
					if (randomWord.includes(letter) && randomWord.charAt(i) != letter) {
						filters[i] = Filters.wrongPosition;
					}
				})

				filteredWords = filteredWords.filter((w) => {
					for (let letterIndex = 0; letterIndex < wordLength; letterIndex++) {
						if (!filters[letterIndex](w, guess.charAt(letterIndex).toLocaleLowerCase(), letterIndex)) {
							return false;
						}
					}
					return true;
				});
				
			}	
			console.log(i);		
		}

		return attemts;
	}
	
	function pickRandomWord(words: string[]): string {
		return words[Math.floor(Math.random()*words.length)]
	}

	function toggleFilter(row, column) {
		let backgroundColor = "";
		if (filters[row][column] == Filters.noFilter) {
			filters[row][column] = Filters.notInWord;
			backgroundColor = "lightgray";
		}
		else if (filters[row][column] == Filters.notInWord) {
			filters[row][column] = Filters.wrongPosition;
			backgroundColor = "orange";
		}
		else if (filters[row][column] == Filters.wrongPosition) {
			filters[row][column] = Filters.rightPosition;
			backgroundColor = "lightgreen";
		}
		else {
			filters[row][column] = Filters.noFilter
		}
		document.getElementById(row.toString().concat(column)).style.backgroundColor = backgroundColor;
	}



	$: {
		filteredWords = words.filter((w) => {
			for (let row = 0; row < nrOfRows; row++) {
				for (let column = 0; column < wordLength; column++) {
					if (letters[row][column] != "" && !filters[row][column](w, letters[row][column].toLocaleLowerCase(), column)) {
						return false;
					}
				}
			}
			return true;
		});	

	}

	$: {
		if (filteredWords.length > 0) { // && filteredWords.length <= 4) {
			displayedWords = [...ratedWords2(filteredWords, filteredWords).keys()].slice(0, 10)
			// displayedWords = [...ratedWords(filteredWords, rateAlphabet(filteredWords)).keys()].slice(0, 10)
		}
		else if (filteredWords.length > 4) {
			displayedWords = [...ratedWords2(words, filteredWords).keys()].slice(0, 10)
			// displayedWords = [...ratedWords(words, rateAlphabet(filteredWords)).keys()].slice(0, 10)
		}
	}

	// function findMostFilteringWord(fromWords: string[], inWords:string[]) {
	// 	let filterScore: number = fromWords.length;
	// 	let indexOfMostFilteringWord: number = 0;
	// 	let wordLength = fromWords[0].length;

	// 	fromWords.forEach((word, i) => {
	// 		let filteredInWordsSize = inWords.filter((w) => {
	// 			for (let column = 0; column < wordLength; column++) {
	// 				if (w.includes(word.charAt(column))) {
	// 					return false;
	// 				}
	// 			} 
	// 			return true
	// 		}).length;

	// 		if (filteredInWordsSize > 0 && filterScore > filteredInWordsSize) {
	// 			console.log(filteredInWordsSize)
	// 			filterScore = filteredInWordsSize;
	// 			indexOfMostFilteringWord = i;
	// 		}
	// 	})

	// 	return fromWords[indexOfMostFilteringWord];
	// }

	const alphabet: string[] = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
	
	function rateAlphabet(words: string[]): Map<string, number[]> {
		const alphabet: string[] = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
		const wordLength = words[0].length;
		const totalNrOfWords = words.length;

		let ratedAlphabet: Map<string, number[]> = new Map();

		for (const letter of alphabet) {
			// let used: boolean = letters[0].includes(letter);
			let rating: number[] = new Array(wordLength + 1);
			rating[wordLength] = words.filter((w) => w.includes(letter)).length;
			for (let i = 0; i < wordLength; i++) {
				rating[i] = Math.pow(words.filter((w) => Filters.rightPosition(w, letter, i)).length, 2);
				rating[i] += Math.pow(words.filter((w) => Filters.wrongPosition(w, letter, i)).length, 2);
				rating[i] += Math.pow(words.filter((w) => Filters.notInWord(w, letter, i)).length, 2);
				rating[i] /= totalNrOfWords;
				// if (used) {
				// 	rating[i] *= 2;
				// }
			}

			if (letters[0].find((l) => l == letter)) {
				
			}

			ratedAlphabet.set(letter, rating);
		}

		return ratedAlphabet;
	}

	function ratedWords(words: string[], filteredWords: string[]): Map<string, number> {
		let ratedWords: Map<string, number> = new Map();
		let sum: number;

		let ratedAlphabet = rateAlphabet(filteredWords)


		words.forEach((word) => {
			sum = 0;
			word.toLocaleLowerCase().split("").forEach((letter, i) => {
				sum += ratedAlphabet.get(letter)[i];
				
				if (word.split(letter).length > 2) {
					sum += 5000;
				}
			})
			ratedWords.set(word, sum)
		})

		return new Map([...ratedWords.entries()].sort((a, b) => a[1] - b[1]))
	}

	function ratedWords2(words: string[], filteredWords: string[]): Map<string, number> {
		let ratedWords: Map<string, number> = new Map(words.sort().map(w => [w, 0]));
		let ratedLettersAtPosition: RatedLetterAtPosition[][] = Array(words[0].length).fill([]);

		ratedLettersAtPosition.forEach((_, i) => {
			ratedLettersAtPosition[i] = new Array<RatedLetterAtPosition>(Math.pow(3,i));
		});

		let sum;
		let probabilitySum;
		ratedWords.forEach((_, word) => {
			sum = 0;
			probabilitySum = 0;
			word.toLocaleLowerCase().split("").forEach((letter, i) => {
				if (i == 0) { 
					ratedLettersAtPosition[i][i] = rateLetterAtPosition(filteredWords, letter, i);
					// sum += ratedLettersAtPosition[i][i].notInWord.filteredWords.length * ratedLettersAtPosition[i][i].notInWord.probability
					// sum += ratedLettersAtPosition[i][i].rightPosition.filteredWords.length * ratedLettersAtPosition[i][i].rightPosition.probability
					// sum += ratedLettersAtPosition[i][i].wrongPosition.filteredWords.length * ratedLettersAtPosition[i][i].wrongPosition.probability
				}
				else {
					let nrOfFilteredWordDimensions = ratedLettersAtPosition[i - 1].length;
					for (let j = 0; j < nrOfFilteredWordDimensions; j++) {	
						ratedLettersAtPosition[i][j] = rateLetterAtPosition(ratedLettersAtPosition[i - 1][j].notInWord.filteredWords, letter, i);
						ratedLettersAtPosition[i][j].notInWord.probability *= ratedLettersAtPosition[i - 1][j].notInWord.probability;
						ratedLettersAtPosition[i][j].rightPosition.probability *= ratedLettersAtPosition[i - 1][j].notInWord.probability;
						ratedLettersAtPosition[i][j].wrongPosition.probability *= ratedLettersAtPosition[i - 1][j].notInWord.probability;
						ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions] = rateLetterAtPosition(ratedLettersAtPosition[i - 1][j].rightPosition.filteredWords, letter, i);
						ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions].notInWord.probability *= ratedLettersAtPosition[i - 1][j].rightPosition.probability;
						ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions].rightPosition.probability *= ratedLettersAtPosition[i - 1][j].rightPosition.probability;
						ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions].wrongPosition.probability *= ratedLettersAtPosition[i - 1][j].rightPosition.probability;
						ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2] = rateLetterAtPosition(ratedLettersAtPosition[i - 1][j].wrongPosition.filteredWords, letter, i);
						ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2].notInWord.probability *= ratedLettersAtPosition[i - 1][j].wrongPosition.probability;
						ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2].wrongPosition.probability *= ratedLettersAtPosition[i - 1][j].wrongPosition.probability;
						ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2].rightPosition.probability *= ratedLettersAtPosition[i - 1][j].wrongPosition.probability;

						if (i == words[0].length - 1) {
							// console.log(ratedLettersAtPosition[i])
							sum += ratedLettersAtPosition[i][j].notInWord.filteredWords.length * ratedLettersAtPosition[i][j].notInWord.probability
							sum += ratedLettersAtPosition[i][j].rightPosition.filteredWords.length * ratedLettersAtPosition[i][j].rightPosition.probability
							sum += ratedLettersAtPosition[i][j].wrongPosition.filteredWords.length * ratedLettersAtPosition[i][j].wrongPosition.probability

							sum += ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions].notInWord.filteredWords.length * ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions].notInWord.probability
							sum += ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions].rightPosition.filteredWords.length * ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions].rightPosition.probability
							sum += ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions].wrongPosition.filteredWords.length * ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions].wrongPosition.probability

							sum += ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2].notInWord.filteredWords.length * ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2].notInWord.probability
							sum += ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2].rightPosition.filteredWords.length * ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2].rightPosition.probability
							sum += ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2].wrongPosition.filteredWords.length * ratedLettersAtPosition[i][j + nrOfFilteredWordDimensions * 2].wrongPosition.probability
							
						}
					}
				}
			})
			ratedWords.set(word, sum);
		})

		return new Map([...ratedWords.entries()].sort((a, b) => a[1] - b[1]))
	}

	interface RatingOfLetter {
		probability: number,
		filteredWords: string[]
	}

	interface RatedLetterAtPosition {
		letter: string;
		notInWord: RatingOfLetter,
		rightPosition: RatingOfLetter,
		wrongPosition: RatingOfLetter
	}

	function rateLetterAtPosition(words: string[], letter: string, position: number): RatedLetterAtPosition {
		const unfilteredNrOfWords = words.length;
		let ratedLetter: RatedLetterAtPosition = {
			letter: letter,
			notInWord: {
				probability: 0,
				filteredWords: words.filter((w) => Filters.notInWord(w, letter, position))
			},
			rightPosition: {
				probability: 0,
				filteredWords: words.filter((w) => Filters.rightPosition(w, letter, position))
			},
			wrongPosition: {
				probability: 0,
				filteredWords: words.filter((w) => Filters.wrongPosition(w, letter, position))
			}
		}
		if (unfilteredNrOfWords) {
			ratedLetter.notInWord.probability = ratedLetter.notInWord.filteredWords.length / unfilteredNrOfWords;
			ratedLetter.rightPosition.probability = ratedLetter.rightPosition.filteredWords.length / unfilteredNrOfWords;
			ratedLetter.wrongPosition.probability = ratedLetter.wrongPosition.filteredWords.length / unfilteredNrOfWords;
		}
		else {
			ratedLetter.notInWord.probability = 0;
			ratedLetter.rightPosition.probability = 0;
			ratedLetter.wrongPosition.probability = 0;
		}


		return ratedLetter;
	}

	function handleInput(e: Event, i, j) {
		let inputEvent = e as InputEvent;
		if (inputEvent.data == null) {
			filters[i][j] = Filters.noFilter
			document.getElementById(i.toString().concat(j)).style.backgroundColor = "";
		}
		else if (alphabet.includes(inputEvent.data.toLocaleLowerCase())) {
			focusNext(i,j);
		}
		
	}

	function focusNext(i, j) {
		if (j < wordLength - 1) {
			document.getElementById((i).toString().concat((j + 1).toString())).focus();
		}
		else {
			document.getElementById((i + 1).toString().concat((0).toString())).focus();
		}
		
	}

</script>

<main>
	{#each letters as row, i}
		<div class="row">
			{#each row as letter, j}
				<input 
					id="{i.toString().concat(j.toString())}" 
					maxlength="1" 
					class="letterbox" 
					bind:value="{letters[i][j]}" 
					on:click="{() => toggleFilter(i,j)}"
					on:input="{(e) => handleInput(e, i ,j)}">
			{/each}
		</div>
		<br>
	{/each}

	<button on:click="{() => console.log(rateAlphabet(filteredWords))}">rateAlphabet</button>

	{#if filteredWords && filteredWords.length > 0}
		<span>{filteredWords.length}</span><br>
		{#each displayedWords as word}
			<br>
			<div class="row">
			{#each word as letter}
				<div class="letterbox">{letter}</div>
			{/each}
			</div>
			
		{/each}
	{/if}
</main>

<style>
	main {
		margin: 0px auto;
		width: 320px;	
	}
	.row {
		display:inline-flex;
	}
	.letterbox {
		float:left;
		box-sizing: border-box;
		padding: 2px;
		margin: 0px 5px 5px 0px;
		border: 1px solid #ccc;
		border-radius: 3px;
		width: 60px;
		height: 60px;
		text-align: center;
		/* vertical-align:middle; */
		font-size: 36px;
	}

</style>