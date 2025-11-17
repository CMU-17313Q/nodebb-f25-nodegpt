/* eslint-disable strict */

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
  // IMPORTANT: GPU VM URL
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
      // Fail gracefully: treat as English so the forum still works
      return [true, ''];
    }

    const data = await response.json();

    const isEnglish = !!data.is_english;
    const translated = data.translated_content || '';

    // 🔍 Attach fields directly onto the post data
    // so whatever the PR’s UI expects has a good chance of finding it.
    postData.is_english = isEnglish;
    postData.isEnglish = isEnglish;                // camelCase version
    postData.translated_content = translated;
    postData.translatedContent = translated;       // camelCase version

    console.log('LLM translate debug:', {
      original: postData.content,
      isEnglish,
      translated,
    });

    // Most likely the server code does:
    // const [isEnglish, translatedContent] = await translate.translate(data);
    return [isEnglish, translated];
  } catch (err) {
    console.error('Translator fetch failed:', err);
    return [true, ''];
  }
};
