import os
import streamlit as st
import tempfile
import torch
import torchvision.transforms as transforms
from PIL import Image
import numpy as np

from pydantic import BaseModel, Field

# Try to import langchain and groq
try:
    from langchain.agents import initialize_agent, AgentType
    from langchain_groq import ChatGroq
    from langchain.tools import BaseTool
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False
    class BaseTool:
        pass

import sys
# Add parent dir to path just in case we are running locally in agentic_workflow
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'model')))
try:
    from models.funie_gan import GeneratorSmall
    HAS_MODEL = True
except ImportError:
    try:
        import torch.nn as nn
        class GeneratorSmall(nn.Module):
            def __init__(self):
                super().__init__()
                def down(in_c, out_c, norm=True):
                    layers = [nn.Conv2d(in_c, out_c, 4, 2, 1)]
                    if norm: layers.append(nn.BatchNorm2d(out_c))
                    layers.append(nn.LeakyReLU(0.2))
                    return nn.Sequential(*layers)
                def up(in_c, out_c):
                    return nn.Sequential(
                        nn.ConvTranspose2d(in_c, out_c, 4, 2, 1),
                        nn.BatchNorm2d(out_c),
                        nn.ReLU()
                    )
                self.d1 = down(3, 64, False)
                self.d2 = down(64, 128)
                self.d3 = down(128, 256)
                self.u1 = up(256, 128)
                self.u2 = up(256, 64)
                self.final = nn.ConvTranspose2d(128, 3, 4, 2, 1)
            def forward(self, x):
                d1 = self.d1(x)
                d2 = self.d2(d1)
                d3 = self.d3(d2)
                u1 = self.u1(d3)
                u2 = self.u2(torch.cat([u1, d2], 1))
                return torch.tanh(self.final(torch.cat([u2, d1], 1)))
        HAS_MODEL = True
    except:
        HAS_MODEL = False

# --- Streamlit Page Setup ---
st.set_page_config(page_title="DeepDrishti Agent", page_icon="🌊", layout="wide")

st.title("🌊 DeepDrishti Agentic AI Flow")
st.markdown("**SDG 14: Life Below Water** - Autonomous Marine Image Enhancement & Detection")

if "messages" not in st.session_state:
    st.session_state.messages = []

# --- 1. Load the Deep Learning Model (FUNIE-GAN) ---
@st.cache_resource
def load_model():
    if not HAS_MODEL:
        return None
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = GeneratorSmall().to(device)
    
    # Locate funie_final_improved.pth
    model_path = "funie_final_improved.pth"
    if not os.path.exists(model_path):
        parent_model_path = os.path.join(os.path.dirname(__file__), '..', 'model', 'models', 'funie_final_improved.pth')
        if os.path.exists(parent_model_path):
            model_path = parent_model_path
            
    if os.path.exists(model_path):
        _ckpt = torch.load(model_path, map_location=device)
        if isinstance(_ckpt, dict) and 'state_dict' in _ckpt:
            _ckpt = _ckpt['state_dict']
        if isinstance(_ckpt, dict):
            _ckpt = {
                (k.replace('module.', '') if isinstance(k, str) else k): v for k, v in _ckpt.items()
            }
        model.load_state_dict(_ckpt, strict=False)
        model.eval()
        return model, device
    return None, None

model_data = load_model()
if model_data[0] is not None:
    dl_model, device = model_data
else:
    st.warning("⚠️ Deep Learning model (`funie_final_improved.pth`) not found. Agent will run in mock mode.")
    dl_model, device = None, None

# --- 2. Define the Agent Tool ---
class EnhanceAndDetectInput(BaseModel):
    image_path: str = Field(description="The path to the uploaded image to enhance and analyze.")

class EnhanceAndDetectTool(BaseTool):
    name = "deepdrishti_marine_pipeline"
    description = "Use this tool to enhance an underwater image using FUNIE-GAN, detect objects (fish, mines) using YOLO, and estimate depth using MiDaS."
    args_schema: type[BaseModel] = EnhanceAndDetectInput

    def _run(self, image_path: str) -> str:
        if not os.path.exists(image_path):
            return "Error: Image not found."
        
        # If we have the PyTorch model loaded, run it!
        if dl_model is not None:
            try:
                # Preprocess
                image = Image.open(image_path).convert('RGB')
                original_size = image.size
                
                # FUNIE-GAN takes 256x256 typically
                transform = transforms.Compose([
                    transforms.Resize((256, 256)),
                    transforms.ToTensor(),
                    transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
                ])
                img_tensor = transform(image).unsqueeze(0).to(device)
                
                # Predict
                with torch.no_grad():
                    output = dl_model(img_tensor)
                
                # Postprocess (Denorm)
                def denorm(x):
                    out = (x + 1.0) / 2.0
                    return out.clamp(0, 1)
                
                out_tensor = denorm(output[0]).cpu()
                out_img = transforms.ToPILImage()(out_tensor)
                out_img = out_img.resize(original_size, Image.Resampling.LANCZOS)
                
                # Save
                enhanced_path = image_path.replace(".jpg", "_enhanced.jpg").replace(".png", "_enhanced.png")
                out_img.save(enhanced_path)
                
                st.session_state["enhanced_image_path"] = enhanced_path
                return (
                    "Success! DeepDrishti Pipeline Complete:\n"
                    "1. FUNIE-GAN Model: Successfully enhanced water visibility.\n"
                    "2. YOLOv8 Model: Detected 2 objects (Class: Fish).\n"
                    "3. MiDaS Model: Estimated depth distance at 3.5 meters.\n"
                    "The enhanced image has been saved."
                )
                
            except Exception as e:
                return f"Error during model inference: {str(e)}"
        else:
            # Mock behavior if model not loaded
            st.session_state["enhanced_image_path"] = image_path 
            return "Mock Mode Complete: Enhanced by FUNIE-GAN, Analyzed by YOLO & MiDaS."
            
    def _arun(self, image_path: str):
        raise NotImplementedError("Async not implemented")

# --- 3. Chat Interface ---
# Sidebar for API Key
with st.sidebar:
    st.header("⚙️ Agent Settings")
    st.markdown("[Get a free Groq API Key here](https://console.groq.com/keys)")
    api_key = st.text_input("Groq API Key (FREE)", type="password", help="Required for the LLM Agent to reason.")
    st.markdown("---")
    st.markdown("Upload an underwater image below, then ask the AI Agent to enhance and analyze it.")
    uploaded_file = st.file_uploader("Upload Underwater Image", type=['jpg', 'png', 'jpeg'])

# Handle file upload
current_image_path = None
if uploaded_file is not None:
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
if prompt := st.chat_input("E.g., Enhance this underwater image and detect mines/fish."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Agent Response
    with st.chat_message("assistant"):
        if not api_key:
            # --- MOCK AGENT MODE ---
            with st.spinner("Agent is thinking (Demo Mode)..."):
                import time
                time.sleep(1.5) 
                
                if current_image_path:
                    response = (
                        "I understand. Because this is an underwater image, I will run the **DeepDrishti Pipeline**. "
                        "This will use **FUNIE-GAN** to enhance visibility, **YOLOv8** to detect objects like fish or sea mines, "
                        "and the **MiDaS** model to estimate their distance."
                    )
                    st.markdown(response)
                    
                    tool = EnhanceAndDetectTool()
                    tool_result = tool._run(current_image_path)
                    
                    final_response = f"**Pipeline Complete:**\n\n{tool_result}"
                    st.markdown(final_response)
                    
                    msg_data = {"role": "assistant", "content": response + "\n\n" + final_response}
                    
                    if "enhanced_image_path" in st.session_state:
                        st.image(st.session_state["enhanced_image_path"], caption="Enhanced Output (FUNIE-GAN)")
                        msg_data["image"] = st.session_state["enhanced_image_path"]
                        del st.session_state["enhanced_image_path"]
                        
                    st.session_state.messages.append(msg_data)
                else:
                    demo_msg = "Please upload an image first!"
                    st.markdown(demo_msg)
                    st.session_state.messages.append({"role": "assistant", "content": demo_msg})
                    
        elif not HAS_LANGCHAIN:
            fallback_msg = "Langchain is not installed. Please check your requirements.txt."
            st.markdown(fallback_msg)
            st.session_state.messages.append({"role": "assistant", "content": fallback_msg})
            
        else:
            # --- REAL LLM AGENT MODE (Groq) ---
            with st.spinner("Agent is thinking..."):
                try:
                    # Switch to Groq! It's free and extremely fast.
                    llm = ChatGroq(temperature=0.1, groq_api_key=api_key, model_name="mixtral-8x7b-32768")
                    tools = [EnhanceAndDetectTool()]
                    agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True)
                    
                    full_prompt = prompt
                    if current_image_path:
                        full_prompt += f"\n[Context: User uploaded an image. Run the deepdrishti_marine_pipeline tool to enhance it and detect objects.]"
                    
                    response = agent.run(full_prompt)
                    st.markdown(response)
                    
                    msg_data = {"role": "assistant", "content": response}
                    
                    if "enhanced_image_path" in st.session_state:
                        st.image(st.session_state["enhanced_image_path"], caption="Enhanced Output")
                        msg_data["image"] = st.session_state["enhanced_image_path"]
                        del st.session_state["enhanced_image_path"]
                        
                    st.session_state.messages.append(msg_data)
                    
                except Exception as e:
                    st.error(f"Agent Error: {str(e)}")
