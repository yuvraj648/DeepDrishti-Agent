# DeepDrishti Agentic AI Flow 🤖🌊

This folder (`agentic_workflow`) transforms the **DeepDrishti Marine Surveillance System** from a standard Deep Learning project into an **Agentic AI Project**. 

This is perfectly aligned with IBM SkillsBuild / CSR Box requirements for Agentic Workflows.

## What makes this "Agentic"?
Instead of a human manually uploading an image to the model via a UI, we have introduced an **AI Agent** (an autonomous LLM). 
The AI Agent is capable of:
1. **Reasoning**: It understands the user's intent in natural language (e.g., "Can you clear up this photo of a sea turtle?").
2. **Tool Use (Function Calling)**: It automatically decides to call the DeepDrishti Deep Learning model (`/enhance` Flask API) as a *tool* to solve the problem.
3. **Action & Observation**: It executes the API call, reads the response, and formulates a final answer for the user.

---

## 🛠️ Option 1: Python LangChain Agent (Code-Based)
If you want to show a coded Agentic workflow, use the provided `agent.py`.

### Setup
1. Ensure your DeepDrishti Model API is running:
   ```bash
   cd ../model
   python app.py
   ```
2. Install the Agent dependencies:
   ```bash
   cd ../agentic_workflow
   pip install -r requirements.txt
   ```
3. Set your OpenAI API Key (the brain of the agent):
   - **Windows CMD:** `set OPENAI_API_KEY=your-api-key-here`
   - **Windows PowerShell:** `$env:OPENAI_API_KEY="your-api-key-here"`
4. Run the Agent:
   ```bash
   python agent.py
   ```
   *You will see the Agent "thinking" in the console, deciding to use the DeepDrishti model, and returning the result.*

---

## ⚡ Option 2: n8n AI Agent Workflow (Low-Code)
If your internship focus was on **n8n** (like your "New Student Welcome" automation), you can use the `n8n_workflow.json` file.

### How to use:
1. Open your **n8n** local instance.
2. Go to **Workflows** -> **Import from File**.
3. Select the `n8n_workflow.json` file in this folder.
4. It will load an advanced **AI Agent Node** connected to:
   - **Window Buffer Memory**: So the agent remembers the chat.
   - **OpenAI Chat Model**: The brain of the agent.
   - **Enhance API Tool (HTTP Request)**: A custom tool we created that connects directly to your DeepDrishti `http://localhost:5001/enhance` endpoint.
5. Click **Chat** in n8n, type "I have an underwater image to fix", and watch the Agent autonomously call your Deep Learning API!

---

## 🎯 Submission Checklist for Life Below Water (SDG 14)
- [x] **Core Deep Learning Model**: Solves SDG 14 by cleaning underwater marine surveillance data.
- [x] **Agentic Architecture**: Instead of just an API, it's orchestrated by an LLM Agent that can reason and use the model as a tool.
- [x] **Ready for Presentation**: You can demonstrate the terminal output from `agent.py` or the visual graph in n8n. Good luck with your submission!
