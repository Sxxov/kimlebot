import Discord from 'discord.js';
import * as fs from 'fs';
import SimpleJSONDb from 'simple-json-db';
import * as dotenv from 'dotenv';

const discord = new Discord.Client();
dotenv.config();

/**
 * @typedef {{
 * 		id: | 'word'
 * 			| 'trigger'
 * 			| 'clear'
 * 			| 'scam'
 * 			| 'annoyMore'
 * 			| 'annoyLess'
 * 			| 'easter'
 * 			| 'none',
 * 		word: string | null,
 * 	}} KimLeBotSentenceType
 * */

class KimLeBot {
	constructor() {
		/** @type {SimpleJSONDb}	*/	this.isAnnoyingInChannelDb = new SimpleJSONDb('./db/annoying.v1.json', { asyncWrite: true });
		/** @type {string[]}		*/	this.words = Object.freeze(new SimpleJSONDb('./db/words.v1.json').get('data'));
		/** @type {string[]}		*/	this.triggers = Object.freeze(new SimpleJSONDb('./db/triggers.v1.json').get('data'));
		/** @type {string[]}		*/	this.scams = fs.readdirSync('./scams').map((scam) => `./scams/${scam}`);
		/** @type {string[]}		*/	this.easterEggs = [
			'fuck up shut',
			'shut fuck the up',
			'shit up',
			'shut the up',
			'up the shut fuck',
		];
	}

	async listen() {
		await discord.login(process.env.DISCORD_TOKEN);
		discord.on('ready', this.onReady.bind(this));
		discord.on('message', this.onMessage.bind(this));
	}

	async onReady() {
		await discord.user.setPresence({
			game: {
				name: 'with ur mom',
			},
			status: 'online',
		});

		console.log('kim le ready');
	}

	/** @param {Discord.Message} message */
	async onMessage(message) {
		if (discord.user.id === message.author.id) {
			return;
		}

		const type = this.getSentenceType(message.content.toLowerCase());

		if (type.id !== 'none') {
			console.log('');
			console.log(`to: ${message.content}`);
		}

		switch (type.id) {
			case 'clear':
				this.clearSelfSentMessagesFrom(message.channel);
				break;
			case 'scam':
				this.sendMessageTo(
					message.channel,
					this.kimLe`${this.getRandomItemFrom(this.words)}`,
					this.getRandomItemFrom(this.scams),
				);
				break;
			case 'trigger':
				this.sendMessageTo(
					message.channel,
					this.kimLe`${this.getRandomItemFrom(this.words)}`,
				);
				break;
			case 'word':
				this.sendMessageTo(
					message.channel,
					this.kimLe`${type.word}`,
				);
				break;
			case 'annoyLess':
				this.annoyLessIn(message.channel);
				break;
			case 'annoyMore':
				this.annoyMoreIn(message.channel);
				break;
			case 'easter':
				this.sendMessageTo(
					message.channel,
					this.getRandomItemFrom(this.easterEggs),
				);
				break;
			case 'none':
				break;
			default:
				throw new Error('Unexpected sentence type');
		}
	}

	/** @param {Discord.Message['channel']} channel */
	async annoyMoreIn(channel) {
		// is true or nullish
		if (this.isAnnoyingInChannelDb.get(channel.id) === true
			|| this.isAnnoyingInChannelDb.get(channel.id) == null) {
			await this.sendMessageTo(channel, 'am i not enough for you');

			return;
		}

		await this.sendMessageTo(channel, 'ok i\'ll be more annoying in this channel');

		this.isAnnoyingInChannelDb.set(channel.id, true);

		console.log('');
		console.log(`became more annoying in: ${channel.id}`);
	}

	/** @param {Discord.Message['channel']} channel */
	async annoyLessIn(channel) {
		// is false (not falsish) to weed out if it's nullish
		if (this.isAnnoyingInChannelDb.get(channel.id) === false) {
			await this.sendMessageTo(channel, 'hey i\'m already trying my best');

			return;
		}

		await this.sendMessageTo(channel, 'fine i\'ll be less annoying in this channel');

		this.isAnnoyingInChannelDb.set(channel.id, false);

		console.log('');
		console.log(`became less annoying in: ${channel.id}`);
	}

	/**
	 * @param {Discord.Message['channel']} channel
	 * @param {string} sentence
	 * @param {string | undefined} image
	 * */
	async sendMessageTo(channel, sentence, image) {
		await channel.send(
			sentence,
			image
				? {
					files: [image],
				}
				: undefined,
		);

		console.log(`sent: ${sentence}${image ? ` [image: ${image}]` : ''}`);
	}

	/** @param {Discord.Message['channel']} channel */
	async clearSelfSentMessagesFrom(channel) {
		const channelMessages = await channel.fetchMessages({ limit: 69 });
		const channelMessagesFromSelf = channelMessages.filter(
			(fetchedMessage) => discord.user.id === fetchedMessage.author.id,
		);

		await channel.bulkDelete(channelMessagesFromSelf);

		console.log('');
		channelMessagesFromSelf.forEach((selfFetchedMessage) => {
			console.log(`deleted: ${selfFetchedMessage.content}`);
		});
	}

	/**
	 * @param {string} sentence
	 * @returns {KimLeBotSentenceType}
	 * */
	getSentenceType(sentence) {
		/** @type {string} */
		let word;

		switch (true) {
			case Boolean(word = this.getWholeWordInSentence('kim le clear', sentence)):
				return { id: 'clear', word };
			case Boolean(word = this.getWholeWordInSentence('scam', sentence)):
				return { id: 'scam', word };
			case Boolean(word = this.triggers.find((trigger) => this.getWholeWordInSentence(trigger, sentence))):
				if (this.getWholeWordInSentence('annoying', sentence)) {
					switch (true) {
						case Boolean(this.getWholeWordInSentence('more annoying', sentence)):
							return { id: 'annoyMore', word: null };
						case Boolean(this.getWholeWordInSentence('less annoying', sentence)):
							return { id: 'annoyLess', word: null };
						case Boolean(this.getWholeWordInSentence('most annoying', sentence))
							|| Boolean(this.getWholeWordInSentence('is annoying', sentence)):
							return { id: 'easter', word: null };
						default:
					}
				}

				return { id: 'trigger', word };
			case Boolean(word = this.words.find((word) => this.getWholeWordInSentence(word, sentence))):
				return { id: 'word', word };
			default:
				return { id: 'none', word: null };
		}
	}

	/**
	 * @param {string} word string that doesn't contain regex special characters
	 * @param {string} sentence
	 * @returns {string | null}
	 */
	getWholeWordInSentence(word, sentence) {
		const regex = new RegExp(`(^|\\s)${word.trim()}($|\\s)`);
		const result = regex.exec(sentence.trim());

		return typeof result?.[0] === 'string'
			? result[0].trim()
			: null;
	}

	kimLe(chunks, ...vars) {
		return `kim le ${
			chunks
				.map(
					(chunk, i) => chunk + (vars[i] ?? ''),
				)
				.join('')
		}`;
	}

	/**
	 * @template T
	 * @param {T[]} array
	 * @returns {T}
	 */
	getRandomItemFrom(array) {
		return array[Math.floor(Math.random() * array.length)];
	}
}

new KimLeBot().listen();
