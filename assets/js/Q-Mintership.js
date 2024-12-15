const messageIdentifierPrefix = `mintership-forum-message`;
const messageAttachmentIdentifierPrefix = `mintership-forum-attachment`;
let adminPublicKeys = []

// NOTE - SET adminGroups in QortalApi.js to enable admin access to forum for specific groups. Minter Admins will be fetched automatically.

let replyToMessageIdentifier = null;
let latestMessageIdentifiers = {}; // To keep track of the latest message in each room
let currentPage = 0; // Track current pagination page
let existingIdentifiers = new Set(); // Keep track of existing identifiers to not pull them more than once.

// If there is a previous latest message identifiers, use them. Otherwise, use an empty.
if (localStorage.getItem("latestMessageIdentifiers")) {
  latestMessageIdentifiers = JSON.parse(localStorage.getItem("latestMessageIdentifiers"));
}

document.addEventListener("DOMContentLoaded", async () => {
  // Identify the links for 'Mintership Forum' and apply functionality
  const mintershipForumLinks = document.querySelectorAll('a[href="MINTERSHIP-FORUM"]');

  mintershipForumLinks.forEach(link => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      //login if not already logged in.
      if (!userState.isLoggedIn) {
        await login();
      }
      await loadForumPage();
      loadRoomContent("general"); // Automatically load General Room on forum load
      startPollingForNewMessages(); // Start polling for new messages after loading the forum page
    });
  });
});

// Main load function to clear existing HTML and load the forum page -----------------------------------------------------
const loadForumPage = async () => {
  // remove everything that isn't the menu from the body to use js to generate page content. 
  const bodyChildren = document.body.children;
    for (let i = bodyChildren.length - 1; i >= 0; i--) {
        const child = bodyChildren[i];
        if (!child.classList.contains('menu')) {
            child.remove();
        }
    }

    if (typeof userState.isAdmin === 'undefined') {
      try {
        // Fetch and verify the admin status asynchronously
        userState.isAdmin = await verifyUserIsAdmin();
      } catch (error) {
        console.error('Error verifying admin status:', error);
        userState.isAdmin = false; // Default to non-admin if there's an issue
      }
    }

  const avatarUrl = `/arbitrary/THUMBNAIL/${userState.accountName}/qortal_avatar`;
  const isAdmin = userState.isAdmin;
  
  // Create the forum layout, including a header, sub-menu, and keeping the original background image: style="background-image: url('/assets/images/background.jpg');">
  const mainContent = document.createElement('div');
  mainContent.innerHTML = `
    <div class="forum-main mbr-parallax-background cid-ttRnlSkg2R">
      <div class="forum-header" style="color: lightblue; display: flex; justify-content: center; align-items: center; padding: 10px;">
        <div class="user-info" style="border: 1px solid lightblue; padding: 5px; color: white; display: flex; align-items: center; justify-content: center;">
          <img src="${avatarUrl}" alt="User Avatar" class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 10px;">
          <span>${userState.accountName || 'Guest'}</span>
        </div>
      </div>
      <div class="forum-submenu">
        <div class="forum-rooms">
          <button class="room-button" id="minters-room">Minters Room</button>
          ${isAdmin ? '<button class="room-button" id="admins-room">Admins Room</button>' : ''}
          <button class="room-button" id="general-room">General Room</button>
        </div>
      </div>
      <div id="forum-content" class="forum-content"></div>
    </div>
  `;

  document.body.appendChild(mainContent);

  // Add event listeners to room buttons
  document.getElementById("minters-room").addEventListener("click", () => {
    currentPage = 0;
    loadRoomContent("minters");
  });
  if (userState.isAdmin) {
    document.getElementById("admins-room").addEventListener("click", () => {
      currentPage = 0;
      loadRoomContent("admins");
    });
  }
  document.getElementById("general-room").addEventListener("click", () => {
    currentPage = 0;
    loadRoomContent("general");
  });
}

// Function to add the pagination buttons and related control mechanisms ------------------------
const renderPaginationControls = (room, totalMessages, limit) => {
  const paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) return;

  paginationContainer.innerHTML = ""; // Clear existing buttons

  const totalPages = Math.ceil(totalMessages / limit);

  // Add "Previous" button
  if (currentPage > 0) {
    const prevButton = document.createElement("button");
    prevButton.innerText = "Previous";
    prevButton.addEventListener("click", () => {
      if (currentPage > 0) {
        currentPage--;
        loadMessagesFromQDN(room, currentPage, false);
      }
    });
    paginationContainer.appendChild(prevButton);
  }

  // Add numbered page buttons
  for (let i = 0; i < totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.innerText = i + 1;
    pageButton.className = i === currentPage ? "active-page" : "";
    pageButton.addEventListener("click", () => {
      if (i !== currentPage) {
        currentPage = i;
        loadMessagesFromQDN(room, currentPage, false);
      }
    });
    paginationContainer.appendChild(pageButton);
  }

  // Add "Next" button
  if (currentPage < totalPages - 1) {
    const nextButton = document.createElement("button");
    nextButton.innerText = "Next";
    nextButton.addEventListener("click", () => {
      if (currentPage < totalPages - 1) {
        currentPage++;
        loadMessagesFromQDN(room, currentPage, false);
      }
    });
    paginationContainer.appendChild(nextButton);
  }
}

// Main function to load the full content of the room, along with all main functionality -----------------------------------
const loadRoomContent = async (room) => {
  const forumContent = document.getElementById("forum-content");

  if (!forumContent) {
    console.error("Forum content container not found!");
    return;
  }

  // Set initial content
  forumContent.innerHTML = `
    <div class="room-content">
      <h3 class="room-title" style="color: lightblue;">${room.charAt(0).toUpperCase() + room.slice(1)} Room</h3>
      <div id="messages-container" class="messages-container"></div>
      <div id="pagination-container" class="pagination-container" style="margin-top: 20px; text-align: center;"></div>
      <div class="message-input-section">
        <div id="toolbar" class="message-toolbar"></div>
        <div id="editor" class="message-input"></div>
        <div class="attachment-section">
          <input type="file" id="file-input" class="file-input" multiple>
          <label for="file-input" class="custom-file-input-button">Select Files</label>
          <input type="file" id="image-input" class="image-input" multiple accept="image/*">
          <label for="image-input" class="custom-image-input-button">Select IMAGES w/Preview</label>
          <button id="add-images-to-publish-button" disabled>Add Images to Multi-Publish</button>
          <div id="preview-container" style="display: flex; flex-wrap: wrap; gap: 10px;"></div>
        </div>
        <button id="send-button" class="send-button">Publish</button>
      </div>
    </div>
  `;

  // Add modal for image preview
  forumContent.insertAdjacentHTML(
    'beforeend',
    `
    <div id="image-modal" class="image-modal">
        <span id="close-modal" class="close">&times;</span>
        <img id="modal-image" class="modal-content">
        <div id="caption" class="caption"></div>
        <button id="download-button" class="download-button">Download</button>
    </div>
  `);

  initializeQuillEditor();
  setupModalHandlers();
  setupFileInputs(room);
  await loadMessagesFromQDN(room, currentPage);
};

// Initialize Quill editor
const initializeQuillEditor = () => {
  new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'blockquote', 'code-block'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['clean']
      ]
    }
  });
};

// Set up modal behavior
const setupModalHandlers = () => {
  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("inline-image")) {
      const modal = document.getElementById("image-modal");
      const modalImage = document.getElementById("modal-image");
      const caption = document.getElementById("caption");

      modalImage.src = event.target.src;
      caption.textContent = event.target.alt;
      modal.style.display = "block";
    }
  });

  document.getElementById("close-modal").addEventListener("click", () => {
    document.getElementById("image-modal").style.display = "none";
  });

  window.addEventListener("click", (event) => {
    const modal = document.getElementById("image-modal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
};

let selectedImages = [];
let selectedFiles = [];
let multiResource = [];
let attachmentIdentifiers = [];

// Set up file input handling
const setupFileInputs = (room) => {
  const imageFileInput = document.getElementById('image-input');
  const previewContainer = document.getElementById('preview-container');
  const addToPublishButton = document.getElementById('add-images-to-publish-button');
  const fileInput = document.getElementById('file-input');
  const sendButton = document.getElementById('send-button');

  const attachmentID = generateAttachmentID(room);

  imageFileInput.addEventListener('change', (event) => {
    previewContainer.innerHTML = '';
    selectedImages = [...event.target.files];

    addToPublishButton.disabled = selectedImages.length === 0;

    selectedImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement('img');
        img.src = reader.result;
        img.alt = file.name;
        img.style = "width: 100px; height: 100px; object-fit: cover; border: 1px solid #ccc; border-radius: 5px;";

        const removeButton = document.createElement('button');
        removeButton.innerText = 'Remove';
        removeButton.classList.add('remove-image-button');
        removeButton.onclick = () => {
          selectedImages.splice(index, 1);
          img.remove();
          removeButton.remove();
          addToPublishButton.disabled = selectedImages.length === 0;
        };

        const container = document.createElement('div');
        container.style = "display: flex; flex-direction: column; align-items: center; margin: 5px;";
        container.append(img, removeButton);
        previewContainer.append(container);
      };
      reader.readAsDataURL(file);
    });
  });

  addToPublishButton.addEventListener('click', () => {
    processSelectedImages(selectedImages, multiResource, room);
    selectedImages = [];
    addToPublishButton.disabled = true;
  });

  fileInput.addEventListener('change', (event) => {
    selectedFiles = [...event.target.files];
  });

  sendButton.addEventListener('click', async () => {
    const quill = new Quill('#editor');
    const messageHtml = quill.root.innerHTML.trim();

    if (messageHtml || selectedFiles.length > 0 || selectedImages.length > 0) {
      await handleSendMessage(room, messageHtml, selectedFiles, selectedImages, multiResource);
    }
  });
};

// Process selected images
const processSelectedImages = async (selectedImages, multiResource, room) => {
  
  for (const file of selectedImages) {
    const attachmentID = generateAttachmentID(room, selectedImages.indexOf(file));
  
    multiResource.push({
      name: userState.accountName,
      service: room === "admins" ? "FILE_PRIVATE" : "FILE",
      identifier: attachmentID,
      file: file, // Use encrypted file for admins
    });
  
    attachmentIdentifiers.push({
      name: userState.accountName,
      service: room === "admins" ? "FILE_PRIVATE" : "FILE",
      identifier: attachmentID,
      filename: file.name,
      mimeType: file.type,
    });
  }
};

// Handle send message
const handleSendMessage = async (room, messageHtml, selectedFiles, selectedImages, multiResource) => {
  const messageIdentifier = room === "admins"
    ? `${messageIdentifierPrefix}-${room}-e-${Date.now()}`
    : `${messageIdentifierPrefix}-${room}-${Date.now()}`;

  const adminPublicKeys = room === "admins" && userState.isAdmin
    ? await fetchAdminGroupsMembersPublicKeys()
    : [];

  try {
    // Process selected images
    if (selectedImages.length > 0) {
      await processSelectedImages(selectedImages, multiResource, room);
    }

    // Process selected files
    if (selectedFiles && selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const attachmentID = generateAttachmentID(room, selectedFiles.indexOf(file));

        multiResource.push({
          name: userState.accountName,
          service: room === "admins" ? "FILE_PRIVATE" : "FILE",
          identifier: attachmentID,
          file: file, // Use encrypted file for admins
        });

        attachmentIdentifiers.push({
          name: userState.accountName,
          service: room === "admins" ? "FILE_PRIVATE" : "FILE",
          identifier: attachmentID,
          filename: file.name,
          mimeType: file.type,
        });
      }
    }

    // Build the message object
    const messageObject = {
      messageHtml,
      hasAttachment: multiResource.length > 0,
      attachments: attachmentIdentifiers,
      replyTo: replyToMessageIdentifier || null, // Include replyTo if applicable
    };

    // Encode the message object
    let base64Message = await objectToBase64(messageObject);
    if (!base64Message) {
      base64Message = btoa(JSON.stringify(messageObject));
    }

    if (room === "admins" && userState.isAdmin) {
      console.log("Encrypting message for admins...");
      
      multiResource.push({
        name: userState.accountName,
        service: "MAIL_PRIVATE",
        identifier: messageIdentifier,
        data64: base64Message,
      });
    } else {
      multiResource.push({
        name: userState.accountName,
        service: "BLOG_POST",
        identifier: messageIdentifier,
        data64: base64Message,
      });
    }

    // Publish resources
    if (room === "admins") {
      if (!userState.isAdmin || adminPublicKeys.length === 0) {
        console.error("User is not an admin or no admin public keys found. Aborting publish.");
        window.alert("You are not authorized to post in the Admin room.");
        return;
      }
      console.log("Publishing encrypted resources for Admin room...");
      await publishMultipleResources(multiResource, adminPublicKeys, true);
    } else {
      console.log("Publishing resources for non-admin room...");
      await publishMultipleResources(multiResource);
    }

    // Clear inputs and show success notification
    clearInputs();
    showSuccessNotification();
  } catch (error) {
    console.error("Error sending message:", error);
  }
};



// Modify clearInputs to reset replyTo
const clearInputs = () => {
  const quill = new Quill('#editor');
  quill.root.innerHTML = "";
  document.getElementById('file-input').value = "";
  document.getElementById('image-input').value = "";
  document.getElementById('preview-container').innerHTML = "";
  replyToMessageIdentifier = null;
  multiResource = [];
  attachmentIdentifiers = [];
  selectedImages = []
  selectedFiles = []

  const replyContainer = document.querySelector(".reply-container");
  if (replyContainer) {
    replyContainer.remove();
  }
};

// Show success notification
const showSuccessNotification = () => {
  const notification = document.createElement('div');
  notification.innerText = "Message published successfully! Please wait for confirmation.";
  notification.style.color = "green";
  notification.style.marginTop = "1em";
  document.querySelector(".message-input-section").appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 10000);
};

// Generate unique attachment ID
const generateAttachmentID = (room, fileIndex = null) => {
  const baseID = room === "admins" ? `${messageAttachmentIdentifierPrefix}-${room}-e-${Date.now()}` : `${messageAttachmentIdentifierPrefix}-${room}-${Date.now()}`;
  return fileIndex !== null ? `${baseID}-${fileIndex}` : baseID;
};

const decryptObject = async (encryptedData) => {
  // const publicKey = await getPublicKeyFromAddress(userState.accountAddress)
  const response = await qortalRequest({
    action: 'DECRYPT_DATA',
    encryptedData, // has to be in base64 format
    // publicKey: publisherPublicKey  // requires the public key of the opposite user with whom you've created the encrypted data. For DIRECT messages only.
  });
  const decryptedObject = response
  return decryptedObject
}

const decryptFile = async (encryptedData) => {
  const publicKey = await getPublicKeyByName(userState.accountName)
  const response = await qortalRequest({
    action: 'DECRYPT_DATA',
    encryptedData, // has to be in base64 format
    // publicKey: publicKey  // requires the public key of the opposite user with whom you've created the encrypted data.
  });
  const decryptedObject = response
  return decryptedObject
}


const loadMessagesFromQDN = async (room, page, isPolling = false) => {
  try {
    const limit = 10;
    const offset = page * limit;
    console.log(`Loading messages for room: ${room}, page: ${page}, offset: ${offset}, limit: ${limit}`);

    // Get the messages container
    const messagesContainer = document.querySelector("#messages-container");
    if (!messagesContainer) return;

    // If not polling, clear the message container and the existing identifiers for a fresh load
    if (!isPolling) {
      messagesContainer.innerHTML = ""; // Clear the messages container before loading new page
      existingIdentifiers.clear(); // Clear the existing identifiers set for fresh page load
    }

    // Get the set of existing identifiers from the messages container
    existingIdentifiers = new Set(Array.from(messagesContainer.querySelectorAll('.message-item')).map(item => item.dataset.identifier));

    // Fetch messages for the current room and page
    const service = room === "admins" ? "MAIL_PRIVATE" : "BLOG_POST"
    const query = room === "admins" ? `${messageIdentifierPrefix}-${room}-e` : `${messageIdentifierPrefix}-${room}`
    
    const response = await searchAllWithOffset(service, query, limit, offset, room);
    console.log(`Fetched messages count: ${response.length} for page: ${page}`);

    if (response.length === 0) {
      // If no messages are fetched and it's not polling, display "no messages" for the initial load
      if (page === 0 && !isPolling) {
        messagesContainer.innerHTML = `<p>No messages found. Be the first to post!</p>`;
      }
      return;
    }

    // Define `mostRecentMessage` to track the latest message during this fetch
    let mostRecentMessage = latestMessageIdentifiers[room]?.latestTimestamp ? latestMessageIdentifiers[room] : null;
    let firstNewMessageIdentifier = null

    // Fetch all messages that haven't been fetched before
    const fetchMessages = await Promise.all(response.map(async (resource) => {
      if (existingIdentifiers.has(resource.identifier)) {
        return null; // Skip messages that are already displayed
      }
    
      try {
        console.log(`Fetching message with identifier: ${resource.identifier}`);
        const messageResponse = await qortalRequest({
          action: "FETCH_QDN_RESOURCE",
          name: resource.name,
          service,
          identifier: resource.identifier,
          ...(room === "admins" ? { encoding: "base64" } : {}),
        });
    
        console.log("Fetched message response:", messageResponse);
    
        const timestamp = resource.updated || resource.created;
        const formattedTimestamp = await timestampToHumanReadableDate(timestamp);
    
        let messageObject;

          if (room === "admins") {
            try {
              const decryptedData = await decryptObject(messageResponse);
              messageObject = JSON.parse(atob(decryptedData))
            } catch (error) {
              console.error(`Failed to decrypt message: ${error.message}`);
              return {
                name: resource.name,
                content: "<em>Encrypted message cannot be displayed</em>",
                date: formattedTimestamp,
                identifier: resource.identifier,
                replyTo: null,
                timestamp,
                attachments: [],
              };
            }
          } else {
            messageObject = messageResponse;
          }

          return {
            name: resource.name,
            content: messageObject?.messageHtml || "<em>Message content missing</em>",
            date: formattedTimestamp,
            identifier: resource.identifier,
            replyTo: messageObject?.replyTo || null,
            timestamp,
            attachments: messageObject?.attachments || [],
          };
        } catch (error) {
          console.error(`Failed to fetch message with identifier ${resource.identifier}. Error: ${error.message}`);
          return {
            name: resource.name,
            content: "<em>Error loading message</em>",
            date: "Unknown",
            identifier: resource.identifier,
            replyTo: null,
            timestamp: resource.updated || resource.created,
            attachments: [],
          };
        }
      })
    );

    // Render new messages without duplication
    for (const message of fetchMessages) {
      if (message && !existingIdentifiers.has(message.identifier)) {
        const isNewMessage = !mostRecentMessage || new Date(message.timestamp) > new Date(mostRecentMessage?.latestTimestamp);
        if (isNewMessage && !firstNewMessageIdentifier) {
          firstNewMessageIdentifier = message.identifier;
        }
        let replyHtml = "";
        if (message.replyTo) {
          const repliedMessage = fetchMessages.find(m => m && m.identifier === message.replyTo);
          if (repliedMessage) {
            replyHtml = `
              <div class="reply-message" style="border-left: 2px solid #ccc; margin-bottom: 0.5vh; padding-left: 1vh;">
                <div class="reply-header">In reply to: <span class="reply-username">${repliedMessage.name}</span> <span class="reply-timestamp">${repliedMessage.date}</span></div>
                <div class="reply-content">${repliedMessage.content}</div>
              </div>
            `;
          }
        }

        let attachmentHtml = "";
        if (message.attachments && message.attachments.length > 0) {
          for (const attachment of message.attachments) {
            if (room !== "admins" && attachment.mimeType && attachment.mimeType.startsWith('image/')) {
              try {
                // Construct the image URL
                const imageUrl = `/arbitrary/${attachment.service}/${attachment.name}/${attachment.identifier}`;
        
                // Add the image HTML with the direct URL
                attachmentHtml += `<div class="attachment">
                  <img src="${imageUrl}" alt="${attachment.filename}" class="inline-image"/>
                </div>`;
        
                // Set up the modal download button
                const downloadButton = document.getElementById("download-button");
                downloadButton.onclick = () => {
                  fetchAndSaveAttachment(
                    attachment.service,
                    attachment.name,
                    attachment.identifier,
                    attachment.filename,
                    attachment.mimeType
                  );
                };
              } catch (error) {
                console.error(`Failed to fetch attachment ${attachment.filename}:`, error);
              }
            } else {
              // Display a button to download non-image attachments
              attachmentHtml += `<div class="attachment">
                <button onclick="fetchAndSaveAttachment('${attachment.service}', '${attachment.name}', '${attachment.identifier}', '${attachment.filename}', '${attachment.mimeType}')">Download ${attachment.filename}</button>
              </div>`;
            }
          }
        }
        
        const avatarUrl = `/arbitrary/THUMBNAIL/${message.name}/qortal_avatar`;
        const messageHTML = `
          <div class="message-item" data-identifier="${message.identifier}">
            <div class="message-header" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center;">
                <img src="${avatarUrl}" alt="Avatar" class="user-avatar" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
                <span class="username">${message.name}</span>
                ${isNewMessage ? `<span class="new-indicator" style="margin-left: 10px; color: red; font-weight: bold;">NEW</span>` : ''}
              </div>
              <span class="timestamp">${message.date}</span>
            </div>
            ${replyHtml}
            <div class="message-text">${message.content}</div>
            <div class="attachments-gallery">
              ${attachmentHtml}
            </div>
            <button class="reply-button" data-message-identifier="${message.identifier}">Reply</button>
          </div>
        `;

        // Append new message to the end of the container
        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);

        // Update mostRecentMessage if this message is newer
        if (!mostRecentMessage || new Date(message.timestamp) > new Date(mostRecentMessage?.latestTimestamp || 0)) {
          mostRecentMessage = {
            latestIdentifier: message.identifier,
            latestTimestamp: message.timestamp
          };
        }

        // Add the identifier to the existingIdentifiers set
        existingIdentifiers.add(message.identifier);
      }
    }

    if (firstNewMessageIdentifier && !isPolling) {
      // Scroll to the first new message
      const newMessageElement = document.querySelector(`.message-item[data-identifier="${firstNewMessageIdentifier}"]`);
      if (newMessageElement) {
        newMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Update latestMessageIdentifiers for the room
    if (mostRecentMessage) {
      latestMessageIdentifiers[room] = mostRecentMessage;
      localStorage.setItem("latestMessageIdentifiers", JSON.stringify(latestMessageIdentifiers));
    }

    // Add event listeners to the reply buttons
    const replyButtons = document.querySelectorAll(".reply-button");
    replyButtons.forEach(button => {
      button.addEventListener("click", () => {
        replyToMessageIdentifier = button.dataset.messageIdentifier;
        // Find the message being replied to
        const repliedMessage = fetchMessages.find(m => m && m.identifier === replyToMessageIdentifier);

        if (repliedMessage) {
          const replyContainer = document.createElement("div");
          replyContainer.className = "reply-container";
          replyContainer.innerHTML = `
            <div class="reply-preview" style="border: 1px solid #ccc; padding: 1vh; margin-bottom: 1vh; background-color: black; color: white;">
              <strong>Replying to:</strong> ${repliedMessage.content}
              <button id="cancel-reply" style="float: right; color: red; background-color: black; font-weight: bold;">Cancel</button>
            </div>
          `;

          if (!document.querySelector(".reply-container")) {
            const messageInputSection = document.querySelector(".message-input-section");

            if (messageInputSection) {
              messageInputSection.insertBefore(replyContainer, messageInputSection.firstChild);

              // Add a listener for the cancel reply button
              document.getElementById("cancel-reply").addEventListener("click", () => {
                replyToMessageIdentifier = null;
                replyContainer.remove();
              });
            }
          }
          const messageInputSection = document.querySelector(".message-input-section");
          const editor = document.querySelector(".ql-editor");

          if (messageInputSection) {
            messageInputSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          if (editor) {
            editor.focus();
          }
        }
      });
    });

    // Render pagination controls
    const totalMessages = await searchAllCountOnly(`${messageIdentifierPrefix}-${room}`);
    renderPaginationControls(room, totalMessages, limit);
  } catch (error) {
    console.error('Error loading messages from QDN:', error);
  }
}


// Polling function to check for new messages without clearing existing ones
function startPollingForNewMessages() {
  setInterval(async () => {
    const activeRoom = document.querySelector('.room-title')?.innerText.toLowerCase().split(" ")[0];
    if (activeRoom) {
      await loadMessagesFromQDN(activeRoom, currentPage, true);
    }
  }, 20000);
}

