import os
import requests
from typing import Optional, Type
from pydantic import BaseModel, Field

# LangChain imports
from langchain.agents import initialize_agent, AgentType
from langchain.chat_models import ChatOpenAI
from langchain.tools import BaseTool

# ---------------------------------------------------------------------------
# 1. Define the Tool for the DeepDrishti Flask Model
# ---------------------------------------------------------------------------
class EnhanceImageInput(BaseModel):
    image_path: str = Field(description="The absolute path to the underwater image file to be enhanced.")

class UnderwaterImageEnhancerTool(BaseTool):
    name = "enhance_underwater_image"
    description = (
        "Use this tool when you need to enhance, clean, or improve visibility of an "
        "underwater image. It uses a specialized Deep Learning U-Net model for marine environments. "
        "Pass the absolute file path of the image to this tool."
    )
    args_schema: Type[BaseModel] = EnhanceImageInput

    def _run(self, image_path: str) -> str:
        """Run the tool: send image to the Flask API."""
        if not os.path.exists(image_path):
            return f"Error: Image file not found at {image_path}"
        
        flask_api_url = "http://localhost:5001/enhance"
        
        try:
            with open(image_path, 'rb') as img_file:
                files = {'image': img_file}
                response = requests.post(flask_api_url, files=files)
                
            if response.status_code == 200:
                data = response.json()
                enhanced_path = data.get("data", {}).get("enhanced_image_path", "Unknown path")
                return f"Successfully enhanced the image! The enhanced image is saved at: {enhanced_path}"
            else:
                return f"Failed to enhance image. API returned status {response.status_code}: {response.text}"
                
        except requests.exceptions.ConnectionError:
            return "Error: Could not connect to the DeepDrishti Model API. Is the Flask server running on port 5001?"
        except Exception as e:
            return f"An unexpected error occurred: {str(e)}"

    def _arun(self, image_path: str):
        """Async execution not implemented for this synchronous tool."""
        raise NotImplementedError("This tool does not support async execution.")

# ---------------------------------------------------------------------------
# 2. Main Agent Setup and Execution
# ---------------------------------------------------------------------------
def run_agentic_workflow(user_prompt: str):
    print("🤖 Initializing Agentic AI Flow...")
    
    # Ensure OPENAI_API_KEY is set in your environment variables
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("⚠️ WARNING: OPENAI_API_KEY environment variable not found.")
        print("Please set it using: set OPENAI_API_KEY=your_api_key (Windows) or export OPENAI_API_KEY=your_api_key (Mac/Linux)")
        print("For this demonstration, the agent requires an LLM to orchestrate the workflow.")
        return

    # Initialize the LLM (The "Brain" of the Agent)
    llm = ChatOpenAI(temperature=0.2, model="gpt-4")

    # Define the tools available to the agent
    tools = [UnderwaterImageEnhancerTool()]

    # Initialize the Agent
    # ZERO_SHOT_REACT_DESCRIPTION allows the agent to reason about which tool to use based on descriptions
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True, # Set to True so you can see the agent's thought process (the "Agentic" part)
        handle_parsing_errors=True
    )

    print(f"\n🗣️ User Request: {user_prompt}\n")
    print("-" * 50)
    
    # Execute the agent workflow
    try:
        response = agent.run(user_prompt)
        print("-" * 50)
        print(f"\n✅ Agent Final Response:\n{response}")
    except Exception as e:
        print(f"Agent encountered an error: {e}")

if __name__ == "__main__":
    # Example usage for your hackathon presentation
    print("Welcome to DeepDrishti Agentic AI Flow!")
    
    # Create a dummy test image if needed, or point to a real one
    sample_image = os.path.abspath("../model/uploads/sample_underwater.jpg")
    
    prompt = (
        "I am doing marine biology research and I have a blurry underwater photo "
        f"located at '{sample_image}'. Can you please enhance its visibility so "
        "I can identify the marine life?"
    )
    
    run_agentic_workflow(prompt)
