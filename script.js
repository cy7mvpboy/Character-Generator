// =================================================================
// DOM Element References
// =================================================================

// --- Core Application Elements ---
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyToggleVisibilityButton = document.getElementById('apiKeyToggleVisibilityButton');
const promptInput = document.getElementById('promptInput');
const generateImageButton = document.getElementById('generateImageButton');
const generateInfoButton = document.getElementById('generateInfoButton');
const clearPromptButton = document.getElementById('clearPromptButton');
const copyInfoButton = document.getElementById('copyInfoButton');
const tokenCountDisplay = document.getElementById('tokenCountDisplay');

// --- Loading and Message Elements ---
const loadingContainer = document.getElementById('loadingContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// --- Image Handling Elements ---
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewImg = imagePreview.querySelector('img');
const descriptionLoading = document.getElementById('descriptionLoading');
const characterImageContainer = document.getElementById('characterImageContainer');

// --- Character Info Elements ---
const characterInfoSection = document.getElementById('characterInfoSection');
const characterInfoOutput = document.getElementById('characterInfoOutput');
const characterInfoLoading = document.getElementById('characterInfoLoading');

// --- UI Enhancement Elements ---
const modelSelector = document.getElementById('modelSelector');
const aspectRatioContainer = document.getElementById('aspectRatioContainer');
const aspectRatioSelector = document.getElementById('aspectRatioSelector');
const aspectRatioNotice = document.getElementById('aspectRatioNotice');
const promptTemplateContainer = document.getElementById('promptTemplateContainer');

// --- Modal Elements ---
const apiKeyGuideLink = document.getElementById('showApiKeyGuide');
const apiKeyGuideModal = document.getElementById('apiKeyGuideModal');
const closeModalButton = apiKeyGuideModal.querySelector('.close-button');
const promptUpdateChoiceModal = document.getElementById('promptUpdateChoiceModal');
const choiceOverwriteButton = document.getElementById('choiceOverwriteButton');
const choiceAppendButton = document.getElementById('choiceAppendButton');
const messageModal = document.getElementById('messageModal');
const messageModalText = document.getElementById('messageModalText');
const messageModalOkButton = document.getElementById('messageModalOkButton');


// =================================================================
// Global State and Variables
// =================================================================

let resolvePromptUpdateChoicePromise; // Stores the promise resolver for the prompt update choice modal.
let resolveMessageModalPromise;      // Stores the promise resolver for the general message modal.
let currentImageDescription = '';    // Holds the description generated from an uploaded image.
let countTokensTimeout;              // Timeout ID for debouncing the token count API call.

// --- Default Selections ---
let selectedModel = 'imagen-3.0-generate-002'; // Default image generation model.
let selectedAspectRatio = '1:1';               // Default aspect ratio.


// =================================================================
// Utility and Helper Functions
// =================================================================

/**
 * Displays a general-purpose message modal and waits for user confirmation.
 * @param {string} message The message to display in the modal.
 * @returns {Promise<void>} A promise that resolves when the user clicks "OK".
 */
function showMessageModal(message) {
    messageModalText.textContent = message;
    messageModal.style.display = 'flex';
    return new Promise((resolve) => {
        resolveMessageModalPromise = resolve;
    });
}

/**
 * Displays a modal asking the user how to apply the new image description.
 * @param {string} description The image description text from the Vision API.
 * @returns {Promise<string>} A promise that resolves with the user's choice ('overwrite' or 'append').
 */
function showPromptUpdateChoiceModal(description) {
    currentImageDescription = description;
    promptUpdateChoiceModal.style.display = 'flex';
    return new Promise((resolve) => {
        resolvePromptUpdateChoicePromise = resolve;
    });
}

/**
 * Updates the visibility and type of the API key input field.
 */
function updateApiKeyUI() {
    if (apiKeyInput.value.trim().length > 0) {
        apiKeyInput.type = 'password';
        apiKeyToggleVisibilityButton.classList.remove('hidden');
        apiKeyToggleVisibilityButton.textContent = '보기';
    } else {
        apiKeyInput.type = 'text';
        apiKeyToggleVisibilityButton.classList.add('hidden');
    }
}

/**
 * Toggles the visibility of the API key text.
 */
function toggleApiKeyVisibility() {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        apiKeyToggleVisibilityButton.textContent = '숨기기';
    } else {
        apiKeyInput.type = 'password';
        apiKeyToggleVisibilityButton.textContent = '보기';
    }
}

/**
 * Escapes HTML special characters in a string to prevent XSS.
 * @param {string} text The string to escape.
 * @returns {string} The escaped, HTML-safe string.
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#039;'
    };
    return text.replace(/[&<>"]/g, (m) => map[m]);
}

/**
 * Displays an error message to the user.
 * @param {string} message The error message to display.
 */
function displayErrorMessage(message) {
    errorMessage.textContent = `⚠️ ${message}`;
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('error-highlight');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
        errorMessage.classList.remove('error-highlight');
    }, 2000);
}

/**
 * Displays a success message that fades out after a short duration.
 * @param {string} message The success message to display.
 */
function displaySuccessMessage(message) {
    successMessage.textContent = `✅ ${message}`;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 2000);
}


// =================================================================
// API Communication Functions
// =================================================================

/**
 * Describes an image using the Gemini Vision API.
 * @param {string} base64ImageData The base64-encoded image data.
 * @param {string} apiKey The user's Gemini API key.
 * @param {string} promptText The text prompt to send with the image.
 * @returns {Promise<string>} A promise that resolves with the image description text.
 */
async function describeImageWithGemini(base64ImageData, apiKey, promptText) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: promptText },
                { inlineData: { mimeType: "image/png", data: base64ImageData } }
            ]
        }],
    };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return result.candidates[0].content.parts[0].text;
    } else {
        throw new Error("Invalid response structure from Gemini Vision API.");
    }
}

/**
 * Generates an image using the selected Gemini image generation model.
 */
async function generateImage() {
    const apiKey = apiKeyInput.value.trim();
    const userPrompt = promptInput.value.trim();

    if (!apiKey) {
        displayErrorMessage("API 키를 먼저 입력해주세요.");
        return;
    }
    if (!userPrompt) {
        displayErrorMessage("캐릭터 설명을 입력해주세요.");
        return;
    }

    // --- UI State: Start Loading ---
    generateImageButton.disabled = true;
    generateInfoButton.disabled = true;
    clearPromptButton.disabled = true;
    promptInput.removeEventListener('input', countPromptTokens);
    loadingContainer.classList.remove('hidden');
    loadingSpinner.classList.remove('hidden');
    loadingMessage.textContent = '이미지 생성 중...';
    characterImageContainer.innerHTML = '';
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');

    try {
        let payload;
        let apiUrl;

        // Configure API endpoint and payload based on the selected model
        if (selectedModel === "gemini-2.0-flash-preview-image-generation") {
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
            payload = {
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
            };
        } else {
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:predict?key=${apiKey}`;
            payload = {
                instances: { prompt: userPrompt },
                parameters: { "sampleCount": 1, "aspectRatio": selectedAspectRatio }
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorDetails = `HTTP Error! Status: ${response.status}`;
            try {
                const errorResult = await response.json();
                errorDetails = errorResult.error?.message || JSON.stringify(errorResult);
            } catch (e) { /* Ignore if response is not JSON */ }
            throw new Error(errorDetails);
        }

        const result = await response.json();
        let imageUrl = '';

        // Extract image data from the response based on the model
        if (selectedModel === "gemini-2.0-flash-preview-image-generation") {
            const imagePart = result.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart?.inlineData?.data) {
                imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            }
        } else {
            if (result.predictions?.[0]?.bytesBase64Encoded) {
                imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
            }
        }

        if (imageUrl) {
            // --- Display Generated Image and Download Button ---
            const imgElement = document.createElement('img');
            imgElement.src = imageUrl;
            imgElement.alt = "생성된 캐릭터 이미지";
            characterImageContainer.appendChild(imgElement);

            const downloadButton = document.createElement('button');
            downloadButton.textContent = '이미지 다운로드';
            downloadButton.classList.add('action-button', 'mt-4');
            downloadButton.onclick = () => {
                const a = document.createElement('a');
                a.href = imageUrl;
                a.download = 'generated_character.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
            characterImageContainer.appendChild(downloadButton);
            displaySuccessMessage("이미지 생성 완료!");
            countPromptTokens();
        } else {
            const feedback = result.promptFeedback || (result.predictions && result.predictions[0]?.promptFeedback);
            if (feedback?.blockReason) {
                 displayErrorMessage(`프롬프트가 정책(${feedback.blockReason})에 위배되어 이미지를 생성할 수 없습니다.`);
            } else {
                displayErrorMessage("이미지 생성 결과가 예상과 다릅니다. API 응답을 확인해 주세요.");
            }
            console.error("Unexpected image generation response:", result);
        }
    } catch (error) {
        displayErrorMessage(`이미지 생성 중 오류 발생: ${error.message}`);
        console.error("Image generation error:", error);
    } finally {
        // --- UI State: End Loading ---
        generateImageButton.disabled = false;
        generateInfoButton.disabled = false;
        clearPromptButton.disabled = false;
        promptInput.addEventListener('input', countPromptTokens);
        loadingContainer.classList.add('hidden');
        loadingMessage.textContent = '';
    }
}

/**
 * Generates character information (bio, traits) using the Gemini LLM.
 */
async function generateCharacterInfo() {
    const apiKey = apiKeyInput.value.trim();
    const userPrompt = promptInput.value.trim();

    if (!apiKey) {
        displayErrorMessage("API 키를 먼저 입력해주세요.");
        return;
    }
    if (!userPrompt) {
        displayErrorMessage("캐릭터 설명을 입력해주세요.");
        return;
    }

    // --- UI State: Start Loading ---
    generateImageButton.disabled = true;
    generateInfoButton.disabled = true;
    clearPromptButton.disabled = true;
    promptInput.removeEventListener('input', countPromptTokens);
    characterInfoLoading.classList.remove('hidden');
    characterInfoLoading.textContent = '캐릭터 정보 생성 중...';
    characterInfoOutput.innerHTML = '';
    characterInfoSection.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    copyInfoButton.classList.add('hidden');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const systemPrompt = `Based on the following character description, generate a short biography, including their personality traits, a brief backstory, and a unique characteristic. Do not use any Markdown syntax. Format the response with clear headings (e.g., 'Personality:', 'Background:', 'Unique Trait:') and use simple line breaks. Do not include any introductory or concluding remarks.\n\nCharacter Description:\n${userPrompt}`;
        const payload = { contents: [{ role: "user", parts: [{ text: systemPrompt }] }] };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorData = { message: `HTTP Error! Status: ${response.status}` };
            try {
                const errorJson = await response.json();
                errorData.message = errorJson.error?.message || JSON.stringify(errorJson);
            } catch (e) {
                errorData.message = await response.text();
            }
            throw new Error(errorData.message);
        }

        const result = await response.json();

        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = result.candidates[0].content.parts[0].text;
            characterInfoOutput.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
            copyInfoButton.classList.remove('hidden');
            displaySuccessMessage("캐릭터 정보 생성 완료!");
            countPromptTokens();
        } else {
            const feedback = result.promptFeedback;
            if (feedback?.blockReason) {
                displayErrorMessage(`콘텐츠 생성 실패: ${feedback.blockReason}. 프롬프트를 수정해 주세요.`);
            } else {
                displayErrorMessage("캐릭터 정보 생성 결과가 예상과 다릅니다. API 응답을 확인해 주세요.");
            }
            console.error("Unexpected character info response:", result);
        }
    } catch (error) {
        displayErrorMessage(`오류 발생: ${error.message}`);
        console.error("Character info generation error:", error);
    } finally {
        // --- UI State: End Loading ---
        generateImageButton.disabled = false;
        generateInfoButton.disabled = false;
        clearPromptButton.disabled = false;
        promptInput.addEventListener('input', countPromptTokens);
        characterInfoLoading.classList.add('hidden');
        characterInfoLoading.textContent = '';
    }
}

/**
 * Counts the number of tokens in the current prompt using the Gemini API.
 * This function is debounced to avoid excessive API calls.
 */
async function countPromptTokens() {
    if (countTokensTimeout) {
        clearTimeout(countTokensTimeout);
    }

    countTokensTimeout = setTimeout(async () => {
        const apiKey = apiKeyInput.value.trim();
        const userPrompt = promptInput.value.trim();

        if (!apiKey) {
            tokenCountDisplay.classList.add('hidden');
            return;
        }
        if (!userPrompt) {
            tokenCountDisplay.classList.remove('hidden');
            tokenCountDisplay.textContent = '프롬프트를 입력해주세요.';
            tokenCountDisplay.style.color = '#999';
            return;
        }

        tokenCountDisplay.classList.remove('hidden');
        tokenCountDisplay.textContent = '토큰 수 계산 중...';
        tokenCountDisplay.style.color = '#666';
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');

        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:countTokens?key=${apiKey}`;
            const payload = { contents: [{ role: "user", parts: [{ text: userPrompt }] }] };
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result && typeof result.totalTokens === 'number') {
                tokenCountDisplay.textContent = `현재 프롬프트 토큰 수: ${result.totalTokens}개`;
                tokenCountDisplay.style.color = '#333';
            } else {
                tokenCountDisplay.textContent = '토큰 수 계산 실패';
                tokenCountDisplay.style.color = '#dc3545';
                console.error("Unexpected token count response:", result);
            }
        } catch (error) {
            tokenCountDisplay.textContent = '토큰 수 계산 오류';
            tokenCountDisplay.style.color = '#dc3545';
            console.error("Token count error:", error);
        }
    }, 500);
}


// =================================================================
// Event Handlers and Listeners
// =================================================================

/**
 * Handles the 'change' event for the image upload input.
 * Reads the file, sends it to the Vision API, and updates the UI.
 */
imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
        imagePreview.style.display = 'none';
        imagePreviewImg.src = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        displayErrorMessage("이미지 파일만 업로드할 수 있습니다.");
        imagePreview.style.display = 'none';
        imagePreviewImg.src = '';
        imageUpload.value = '';
        return;
    }

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        displayErrorMessage("API 키를 먼저 입력해주세요.");
        imageUpload.value = '';
        return;
    }

    // --- UI State: Start Loading ---
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');
    descriptionLoading.classList.remove('hidden');
    descriptionLoading.textContent = '이미지 특징 분석 중...';
    generateImageButton.disabled = true;
    generateInfoButton.disabled = true;
    clearPromptButton.disabled = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64ImageData = e.target.result.split(',')[1];
        imagePreviewImg.src = e.target.result;
        imagePreview.style.display = 'block';

        try {
            const imageDescriptionPrompt = `Based on the uploaded image, generate a detailed character description following these sections. Focus on visual elements. Do not include any introductory or concluding remarks, just the structured description.\n\nSubject: [Describe the main subject of the character, e.g., 'A cute animal mascot', 'A stylized human character']\nContext & Background: [Describe the environment or context the character is in, e.g., 'Against a plain studio background', 'In a simple, abstract setting']\nStyle: [Describe the art style, e.g., 'Flat design with bold outlines', 'Vector illustration with clean lines', 'Minimalist graphic design']\nDetailed Description & Quality: [Provide detailed visual attributes, including appearance (shape, color palette, features, expression), unique traits, props, symbolic elements, and desired image quality (e.g., 'high-quality', 'crisp', 'clean', 'professional branding design').]`;
            const imageDescription = await describeImageWithGemini(base64ImageData, apiKey, imageDescriptionPrompt);
            await showPromptUpdateChoiceModal(imageDescription.trim());
            displaySuccessMessage("이미지 분석 완료!");
        } catch (error) {
            displayErrorMessage("이미지 분석 중 오류가 발생했습니다. API 키가 올바른지 확인하거나 ��시 후 다시 시도해 주세요.");
            console.error("Image analysis error:", error);
        } finally {
            // --- UI State: End Loading ---
            descriptionLoading.classList.add('hidden');
            generateImageButton.disabled = false;
            generateInfoButton.disabled = false;
            clearPromptButton.disabled = false;
            countPromptTokens();
        }
    };
    reader.readAsDataURL(file);
});

/**
 * Copies the generated character information to the clipboard.
 * Provides feedback to the user on success or failure.
 */
copyInfoButton.addEventListener('click', async () => {
    const textToCopy = characterInfoOutput.textContent;
    // Use modern Clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            const originalText = copyInfoButton.textContent;
            copyInfoButton.textContent = '복사 완료!';
            setTimeout(() => { copyInfoButton.textContent = originalText; }, 1500);
            displaySuccessMessage("정보가 클립보드에 복사되었습니다!");
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            await showMessageModal('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
        }
    } else {
        // Fallback for older browsers
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = textToCopy;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        try {
            document.execCommand('copy');
            const originalText = copyInfoButton.textContent;
            copyInfoButton.textContent = '복사 완료!';
            setTimeout(() => { copyInfoButton.textContent = originalText; }, 1500);
            displaySuccessMessage("정보가 클립보드에 복사되었습니다!");
        } catch (err) {
            console.error('Clipboard copy fallback failed:', err);
            await showMessageModal('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
        } finally {
            document.body.removeChild(tempTextArea);
        }
    }
});

/**
 * Clears the content of the prompt textarea.
 */
clearPromptButton.addEventListener('click', () => {
    promptInput.value = '';
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');
    countPromptTokens();
});

/**
 * Handles card selection logic for models and aspect ratios.
 * @param {HTMLElement} container The container holding the selectable cards.
 * @param {HTMLElement} selectedCard The card element that was clicked.
 * @returns {string} The data value (model or ratio) of the selected card.
 */
function handleCardSelection(container, selectedCard) {
    container.querySelectorAll('.card-item').forEach(card => {
        card.classList.remove('selected');
    });
    selectedCard.classList.add('selected');
    return selectedCard.dataset.model || selectedCard.dataset.ratio;
}

/**
 * Updates the aspect ratio selector's UI based on the selected model's capabilities.
 */
function updateAspectRatioUI() {
    const modelsWithoutAspectRatio = ["gemini-2.0-flash-preview-image-generation"];
    const isDisabled = modelsWithoutAspectRatio.includes(selectedModel);
    
    aspectRatioContainer.classList.toggle('disabled', isDisabled);
    aspectRatioNotice.classList.toggle('hidden', !isDisabled);
}

// --- Modal-related Event Listeners ---
messageModalOkButton.addEventListener('click', () => {
    messageModal.style.display = 'none';
    if (resolveMessageModalPromise) {
        resolveMessageModalPromise();
        resolveMessageModalPromise = null;
    }
});

choiceOverwriteButton.addEventListener('click', () => {
    promptUpdateChoiceModal.style.display = 'none';
    if (resolvePromptUpdateChoicePromise) {
        promptInput.value = currentImageDescription;
        resolvePromptUpdateChoicePromise('overwrite');
        resolvePromptUpdateChoicePromise = null;
    }
});

choiceAppendButton.addEventListener('click', () => {
    promptUpdateChoiceModal.style.display = 'none';
    if (resolvePromptUpdateChoicePromise) {
        const currentPrompt = promptInput.value.trim();
        promptInput.value = currentPrompt ? `${currentPrompt}\n\n${currentImageDescription}` : currentImageDescription;
        resolvePromptUpdateChoicePromise('append');
        resolvePromptUpdateChoicePromise = null;
    }
});

apiKeyGuideLink.addEventListener('click', (event) => {
    event.preventDefault();
    apiKeyGuideModal.style.display = 'flex';
});

closeModalButton.addEventListener('click', () => {
    apiKeyGuideModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === apiKeyGuideModal) {
        apiKeyGuideModal.style.display = 'none';
    }
});

// --- UI Interaction Event Listeners ---
modelSelector.addEventListener('click', (event) => {
    const selectedCard = event.target.closest('.model-card');
    if (selectedCard) {
        selectedModel = handleCardSelection(modelSelector, selectedCard);
        updateAspectRatioUI();
    }
});

aspectRatioSelector.addEventListener('click', (event) => {
    const selectedCard = event.target.closest('.aspect-ratio-card');
    if (selectedCard) {
        selectedAspectRatio = handleCardSelection(aspectRatioSelector, selectedCard);
    }
});

promptTemplateContainer.addEventListener('click', (event) => {
    const button = event.target.closest('.prompt-template-btn');
    if (button) {
        const templateName = button.dataset.template;
        if (promptTemplates[templateName]) {
            promptInput.value = promptTemplates[templateName];
            countPromptTokens();
        }
    }
});

// --- Core Application Event Listeners ---
generateImageButton.addEventListener('click', generateImage);
generateInfoButton.addEventListener('click', generateCharacterInfo);
promptInput.addEventListener('input', countPromptTokens);
apiKeyInput.addEventListener('input', () => {
    updateApiKeyUI();
    countPromptTokens();
});
apiKeyToggleVisibilityButton.addEventListener('click', toggleApiKeyVisibility);


// =================================================================
// Initialization
// =================================================================

// --- Prompt Templates ---
const promptTemplates = {
    fantasy: `Subject: A wise elf mage with glowing eyes\nContext & Background: In an ancient, enchanted forest at dusk\nStyle: Detailed digital painting, fantasy art, cinematic lighting\nDetailed Description & Quality: Wearing intricate silver robes, holding a crystal staff, high-quality, detailed, 4K`,
    'sci-fi': `Subject: A sleek cyborg assassin\nContext & Background: On a neon-lit rooftop in a futuristic cyberpunk city\nStyle: Sci-fi concept art, realistic, Blade Runner aesthetic\nDetailed Description & Quality: Chrome exoskeleton, glowing red optic sensors, holding a plasma rifle, HDR, cinematic, detailed textures`,
    mascot: `Subject: A friendly, cute bear mascot for a honey brand\nContext & Background: Simple, clean studio background, vibrant colors\nStyle: 3D render, cartoon style, soft lighting\nDetailed Description & Quality: Round and fluffy body, big welcoming eyes, holding a honey pot, brandable, high-quality, family-friendly`,
    pixel: `Subject: A heroic knight in full armor\nContext & Background: Standing in front of a pixelated castle\nStyle: 16-bit pixel art, retro video game style, Aseprite\nDetailed Description & Quality: Shiny plate armor, holding a large sword and shield, vibrant color palette, crisp pixels, SNES style`
};

/**
 * Initializes the application when the window loads.
 * Sets up the UI, default values, and initial state.
 */
window.onload = () => {
    updateApiKeyUI();
    
    // Populate the prompt with the default fantasy template.
    promptInput.value = promptTemplates.fantasy; 

    // Set the default selected cards for model and aspect ratio.
    const defaultModelCard = modelSelector.querySelector(`[data-model="${selectedModel}"]`);
    const defaultRatioCard = aspectRatioSelector.querySelector(`[data-ratio="${selectedAspectRatio}"]`);
    if (defaultModelCard) defaultModelCard.classList.add('selected');
    if (defaultRatioCard) defaultRatioCard.classList.add('selected');

    // Initialize UI states.
    updateAspectRatioUI();
    countPromptTokens();
};