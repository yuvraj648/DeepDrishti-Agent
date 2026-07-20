import os
import streamlit as st
import tempfile
import torch
import torchvision.transforms as transforms
from PIL import Image
import numpy as np

# Try to import langchain (needs: pip install langchain langchain-openai openai pydantic)
try:
    from langchain.agents import initialize_agent, AgentType
    from langchain.chat_models import ChatOpenAI
    from langchain.tools import BaseTool
    from pydantic import BaseModel, Field
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False

# Import the actual U-Net model from the parent model directory (if running locally)
# For deployment, we will copy model.py and model.pth into the same directory.
import sys
# Add parent dir to path just in case we are running locally in agentic_workflow
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'model')))
try:
    from model import UNet
    HAS_MODEL = True
except ImportError:
    HAS_MODEL = False

# --- Streamlit Page Setup ---
st.set_page_config(page_title="DeepDrishti Agent", page_icon="🌊", layout="wide")

st.title("🌊 DeepDrishti Agentic AI Flow")
st.markdown("**SDG 14: Life Below Water** - Autonomous Marine Image Enhancement")

# --- Initialize Session State ---
if "messages" not in st.session_state:
    st.session_state.messages = []

# --- 1. Load the Deep Learning Model ---
@st.cache_resource
def load_model():
    if not HAS_MODEL:
        return None
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = UNet(n_channels=3, n_classes=3).to(device)
    
    # Locate model.pth
    model_path = "model.pth"
    if not os.path.exists(model_path):
        parent_model_path = os.path.join(os.path.dirname(__file__), '..', 'model', 'model.pth')
        if os.path.exists(parent_model_path):
            model_path = parent_model_path
            
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.eval()
        return model, device
    return None, None

model_data = load_model()
if model_data[0] is not None:
    dl_model, device = model_data
else:
    st.warning("⚠️ Deep Learning model (`model.pth` or `model.py`) not found. Agent will run in mock mode.")
    dl_model, device = None, None

# --- 2. Define the Agent Tool ---
class EnhanceImageInput(BaseModel):
    image_path: str = Field(description="The path to the uploaded image to enhance.")

class EnhanceImageTool(BaseTool):
    name = "enhance_underwater_image"
    description = "Use this tool to enhance and clear up an underwater image using a Deep Learning model. Pass the file path of the image."
    args_schema: type[BaseModel] = EnhanceImageInput

    def _run(self, image_path: str) -> str:
        if not os.path.exists(image_path):
            return "Error: Image not found."
        
        # If we have the PyTorch model loaded, run it locally!
        if dl_model is not None:
            try:
                # Preprocess
                image = Image.open(image_path).convert('RGB')
                original_size = image.size
                transform = transforms.Compose([
                    transforms.Resize((256, 256)),
                    transforms.ToTensor()
                ])
                img_tensor = transform(image).unsqueeze(0).to(device)
                
                # Predict
                with torch.no_grad():
                    output = dl_model(img_tensor)
                    output = torch.sigmoid(output)
                
                # Postprocess
                out_tensor = output.squeeze().cpu()
                out_img = transforms.ToPILImage()(out_tensor)
                out_img = out_img.resize(original_size, Image.Resampling.LANCZOS)
                
                # Save
                enhanced_path = image_path.replace(".jpg", "_enhanced.jpg").replace(".png", "_enhanced.png")
                out_img.save(enhanced_path)
                
                st.session_state["enhanced_image_path"] = enhanced_path
                return f"Success! I have enhanced the image using DeepDrishti U-Net. It is saved at {enhanced_path}"
                
            except Exception as e:
                return f"Error during model inference: {str(e)}"
        else:
            # Mock behavior if model not loaded
            st.session_state["enhanced_image_path"] = image_path # just return original
            return "I used the enhancement tool (Mock Mode). The image has been processed."
            
    def _arun(self, image_path: str):
        raise NotImplementedError("Async not implemented")

# --- 3. Chat Interface ---
# Sidebar for API Key
with st.sidebar:
    st.header("⚙️ Agent Settings")
    api_key = st.text_input("OpenAI API Key", type="password", help="Required for the LLM Agent to reason.")
    st.markdown("---")
    st.markdown("Upload an underwater image below, then ask the AI Agent to enhance it.")
    uploaded_file = st.file_uploader("Upload Underwater Image", type=['jpg', 'png', 'jpeg'])

# Handle file upload
current_image_path = None
if uploaded_file is not None:
    # Save uploaded file to temp dir
    temp_dir = tempfile.gettempdir()
    current_image_path = os.path.join(temp_dir, uploaded_file.name)
    with open(current_image_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    
    st.sidebar.image(current_image_path, caption="Uploaded Image", use_column_width=True)
    st.sidebar.success("Image loaded into Agent memory!")

# Display chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if "image" in msg:
            st.image(msg["image"], caption="Agent Tool Output", use_column_width=True)

# Chat Input
if prompt := st.chat_input("E.g., Can you enhance this underwater image?"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Agent Response
    with st.chat_message("assistant"):
        if not api_key or not HAS_LANGCHAIN:
            fallback_msg = "Please provide an OpenAI API Key in the sidebar and ensure langchain is installed to use the Agentic capabilities."
            st.markdown(fallback_msg)
            st.session_state.messages.append({"role": "assistant", "content": fallback_msg})
        else:
            with st.spinner("Agent is thinking..."):
                try:
                    llm = ChatOpenAI(temperature=0.1, openai_api_key=api_key, model="gpt-3.5-turbo")
                    tools = [EnhanceImageTool()]
                    agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True)
                    
                    # Inject image path into prompt if available
                    full_prompt = prompt
                    if current_image_path:
                        full_prompt += f"\n[Context: User has uploaded an image located at: {current_image_path}]"
                    
                    response = agent.run(full_prompt)
                    st.markdown(response)
                    
                    # Store response
                    msg_data = {"role": "assistant", "content": response}
                    
                    # Show enhanced image if the tool ran
                    if "enhanced_image_path" in st.session_state:
                        st.image(st.session_state["enhanced_image_path"], caption="Enhanced Output")
                        msg_data["image"] = st.session_state["enhanced_image_path"]
                        del st.session_state["enhanced_image_path"] # clear for next run
                        
                    st.session_state.messages.append(msg_data)
                    
                except Exception as e:
                    st.error(f"Agent Error: {str(e)}")
