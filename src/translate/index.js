/* eslint-disable strict */

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	const TRANSLATOR_API = 'http://crs-17313-nodegpt-gpu.qatar.cmu.edu/translate';

	try {
		const response = await fetch(TRANSLATOR_API, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				content: postData.content.toString(),
			}),
		});

		if (!response.ok) {
			console.error('Translator API responded with status:', response.status);
			// Fail gracefully so NodeBB keeps working
			return [true, ''];
		}

		const data = await response.json();

		const isEnglish = !!data.is_english;
		const translated = data.translated_content || '';

		// Attach fields for debugging / templates
		postData.is_english = isEnglish;
		postData.isEnglish = isEnglish; // camelCase version
		postData.translated_content = translated;
		postData.translatedContent = translated; // camelCase version

		console.log('LLM translate debug:', {
			original: postData.content,
			isEnglish,
			translated,
		});

		return [isEnglish, translated];
	} catch (err) {
		console.error('Translator fetch failed:', err);
		return [true, ''];
	}
};
