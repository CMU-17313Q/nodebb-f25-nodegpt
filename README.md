# Translator Service

This repo contains a Python Flask web app that will perform live translations for input text. The repo contains starter code that provides hard-coded dummy translations, which you can modify to include calls to an LLM.

# Build and run on your GPU VM

You should clone this repository in your GPU VM, as that is where you will be doing the development and, once finished, the deployment.

## Step 1: Installing Dependencies

Ideally, you should use Python virtual environments. However, for simplicity, we will skip them and work directly with your VM’s Python installation. Since you already installed most of the dependencies while working on your notebook, there isn’t much left to install.

```bash
pip install -r requirements.txt # Installs dependencies from requirements.txt
```


## Step 3: Run tests locally
```bash
pytest                      # You should see the tests in test_translator.py run and pass successfully
```

## Step 4: Run the translator service on your GPU VM

```bash
flask run --host:0.0.0.0 --port=8080                   # Starts a web server on http://<your-gpu-vm>.qatar.cmu.edu:8080
```

Navigate to [http://your-gpu-vm:8080/?content=Dies ist eine Nachricht auf Deutsch](http://your-gpu-vm:8080/?content=Dies%20ist%20eine%20Nachricht%20auf%20Deutsch) (replace your-gpu-vm with the hostname of your GPU VM, and you should see the response JSON:

```
{"is_english":false,"translated_content":"This is a German message"}
```

See the code in `src/translator.py` for the full list of hard-coded dummy translations.

# Integrating the translator service with NodeBB

Now that you have a dummy translator service deployed, you can integrate it into NodeBB by allowing new posts to be translated at creation time and to display a "Translate" button for such posts. To save you the trouble, we are providing the code changes required for this UI.
[https://github.com/CMU-17313Q/NodeBB/pull/100](https://github.com/CMU-17313Q/NodeBB/pull/100)

You can merge this commit directly if you know how to set up a new remote and perform cherry picking; or you can just look at the diffs above and copy+paste the changes carefully into your own NodeBB repos. These are provided only as suggestions but you are welcome to do something else.

## Testing the integration

Then redeploy NodeBB to your Linux VM using Docker.

Now, when you create a new post using one of the hard-coded non-English text they should get translated automatically by the back-end:

![image](https://github.com/user-attachments/assets/61f1d9ca-3ca4-4a68-8869-d381d3d06ac6)

After submitting...

![image](https://github.com/user-attachments/assets/f07d51ea-217a-44d8-a314-62bbe1a4cee4)

Clicking the button reveals...

![image](https://github.com/user-attachments/assets/1e804235-684f-46fd-b016-0d3dd3297991)


# Implementing the LLM-based translator

Please replace `translate` method in `src/translator.py` with your LLM-based
implementation. The `translate` method takes a string `content` as input and
returns a tuple `(bool, str)`, indicating if `content` is in English and
the translated content if `content` is not in English.  This should call out to your Python service you developed.

## Handle responses from the LLM

You need to design your prompt so that you can parse the result from an LLM model.
However, your system needs to be robust enough to recover if the LLM does not respond as you expect.
It is up to you how your system reacts to unexpected responses. You can try a different prompt, return an error message, or simply assume the input is in English.

# Testing your implementation

Now you need to test your implementation.

To do this, please complete the unit test in `test/unit/test_translator.py`.
In `test_llm_normal_response()`, please implement a unit test that verifies that
your program can return correct value if LLM provides an expected result.
In `test_llm_gibberish_response()`, please implement a unit test that verifies
that your program can handle a gibberish response.
