#!/usr/bin/env python3
"""
Robust PDF to Markdown Converter using GLM-OCR via Ollama
"""

import os
import sys
import re
import base64
import requests
import subprocess
from pathlib import Path
from typing import List, Dict, Optional
import json

class PDFToMarkdownConverter:
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url.rstrip('/')
        self.model_name = "glm-ocr"
        
    def check_ollama_available(self) -> bool:
        """Check if Ollama server is running and model is available"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get('models', [])
                if self.model_name in [m['name'] for m in models]:
                    print("✅ GLM-OCR model is available")
                    return True
                else:
                    print(f"⚠️ GLM-OCR model not found. Available models:")
                    for model in models:
                        print(f"   - {model['name']}")
                    return False
            return False
        except requests.exceptions.ConnectionError:
            print("❌ Ollama server is not running. Please start it first:")
            print("   ollama pull glmocr")
            print("   ollama serve")
            return False
    
    def convert_pdf_to_images(self, pdf_path: str, output_dir: str) -> List[str]:
        """Convert PDF to PNG images"""
        try:
            # Create output directory
            os.makedirs(output_dir, exist_ok=True)
            
            # Extract base name without extension
            pdf_name = Path(pdf_path).stem
            output_prefix = os.path.join(output_dir, pdf_name)
            
            # Use pdftoppm to convert PDF to images
            cmd = ["pdftoppm", "-png", "-r", "300", pdf_path, output_prefix]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"❌ pdftoppm failed: {result.stderr}")
                return []
            
            # Get all generated PNG files
            png_files = sorted(Path(output_dir).glob(f"{pdf_name}-*.png"))
            
            print(f"✅ Converted PDF to {len(png_files)} images")
            return [str(f) for f in png_files]
            
        except Exception as e:
            print(f"❌ Error converting PDF to images: {str(e)}")
            return []
    
    def image_to_base64(self, image_path: str) -> Optional[str]:
        """Convert image to base64 string"""
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            print(f"❌ Error reading image {image_path}: {str(e)}")
            return None
    
    def extract_text_with_glmocr(self, image_base64: str) -> str:
        """Extract text from image using GLM-OCR via Ollama"""
        try:
            payload = {
                "model": self.model_name,
                "prompt": "Extract all text from this image and format it as structured markdown. Maintain the original table structure and formatting.",
                "images": [image_base64],
                "stream": False
            }
            
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                print(f"❌ GLM-OCR API error: {response.status_code}")
                print(f"Response: {response.text}")
                return ""
                
        except Exception as e:
            print(f"❌ Error calling GLM-OCR API: {str(e)}")
            return ""
    
    def clean_markdown_content(self, raw_content: str) -> str:
        """Clean and structure the extracted markdown content"""
        # Remove extra whitespace
        content = re.sub(r'\n\s*\n', '\n\n', raw_content.strip())
        
        # Clean up page number prefixes
        content = re.sub(r'^\s*\d+\|', '', content, flags=re.MULTILINE)
        
        # Fix common OCR artifacts
        content = re.sub(r'\s+', ' ', content)  # Multiple spaces to single space
        content = re.sub(r'\|\s*\|', '| |', content)  # Fix empty cells
        
        return content
    
    def convert_pdf_to_markdown(self, pdf_path: str, output_path: str = None) -> bool:
        """Main conversion function"""
        pdf_file = Path(pdf_path)
        if not pdf_file.exists():
            print(f"❌ PDF file not found: {pdf_path}")
            return False
        
        if not self.check_ollama_available():
            return False
        
        # Set output paths
        if output_path is None:
            output_path = pdf_file.with_suffix('.md')
        
        temp_dir = f"temp_images_{pdf_file.stem}"
        
        print(f"📄 Converting {pdf_path} to markdown...")
        
        # Step 1: Convert PDF to images
        print("🖼️  Converting PDF to images...")
        png_files = self.convert_pdf_to_images(str(pdf_file), temp_dir)
        if not png_files:
            return False
        
        # Step 2: Extract text from each image
        print("🔍 Extracting text from images...")
        all_content = []
        
        for i, png_file in enumerate(png_files):
            print(f"   Processing page {i+1}/{len(png_files)}...")
            
            image_base64 = self.image_to_base64(png_file)
            if not image_base64:
                continue
                
            page_content = self.extract_text_with_glmocr(image_base64)
            if page_content:
                # Add page header
                page_content = f"## Page {i+1}\n\n{page_content}"
                all_content.append(page_content)
        
        if not all_content:
            print("❌ No content extracted from any pages")
            return False
        
        # Step 3: Combine and clean content
        print("📝 Combining and cleaning content...")
        combined_content = "\n\n".join(all_content)
        clean_content = self.clean_markdown_content(combined_content)
        
        # Step 4: Save markdown file
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(clean_content)
            print(f"✅ Markdown saved to: {output_path}")
            return True
        except Exception as e:
            print(f"❌ Error saving markdown file: {str(e)}")
            return False
        finally:
            # Cleanup temporary files
            try:
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
            except:
                pass

def main():
    """Command line interface"""
    if len(sys.argv) < 2:
        print("Usage: python pdf_to_md.py <pdf_file> [output_file]")
        print("Example: python pdf_to_md.py document.pdf output.md")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    converter = PDFToMarkdownConverter()
    success = converter.convert_pdf_to_markdown(pdf_file, output_file)
    
    if success:
        print("\n🎉 Conversion completed successfully!")
    else:
        print("\n❌ Conversion failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()