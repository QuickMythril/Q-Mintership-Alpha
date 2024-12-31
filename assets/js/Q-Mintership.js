const messageIdentifierPrefix = `mintership-forum-message`;
const messageAttachmentIdentifierPrefix = `mintership-forum-attachment`;

// NOTE - SET adminGroups in QortalApi.js to enable admin access to forum for specific groups. Minter Admins will be fetched automatically.

let replyToMessageIdentifier = null;
let latestMessageIdentifiers = {}; // To keep track of the latest message in each room
let currentPage = 0; // Track current pagination page
let existingIdentifiers = new Set(); // Keep track of existing identifiers to not pull them more than once.

let messagesById = {}
let messageOrder =[]
const MAX_MESSAGES = 2000
// Key = message.identifier
// Value = { ...the message object with timestamp, name, content, etc. }

// If there is a previous latest message identifiers, use them. Otherwise, use an empty.

const storeMessageInMap = (msg) => {
  if (!msg?.identifier || !msg || !msg?.timestamp) return

  messagesById[msg.identifier] = msg
  // We will keep an array 'messageOrder' to store the messages and limit the size they take
  messageOrder.push({ identifier: msg.identifier, timestamp: msg.timestamp })
  messageOrder.sort((a, b) => a.timestamp - b.timestamp);

  while (messageOrder.length > MAX_MESSAGES) {
    // Remove oldest from the front
    const oldest = messageOrder.shift();
    // Delete from the map as well
    delete messagesById[oldest.identifier];
  }
}

function saveMessagesToLocalStorage() {
  try {
    const data = { messagesById, messageOrder };
    localStorage.setItem("forumMessages", JSON.stringify(data));
    console.log("Saved messages to localStorage. Count:", messageOrder.length);
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

function loadMessagesFromLocalStorage() {
  try {
    const stored = localStorage.getItem("forumMessages");
    if (!stored) {
      console.log("No saved messages in localStorage.");
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.messagesById && parsed.messageOrder) {
      messagesById = parsed.messagesById;
      messageOrder = parsed.messageOrder;
      console.log(`Loaded ${messageOrder.length} messages from localStorage.`);
    }
  } catch (error) {
    console.error("Error loading messages from localStorage:", error);
  }
}

if (localStorage.getItem("latestMessageIdentifiers")) {
  latestMessageIdentifiers = JSON.parse(localStorage.getItem("latestMessageIdentifiers"));
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded fired!");

  // --- GENERAL LINKS (MINTERSHIP-FORUM and MINTER-BOARD) ---
  const mintershipForumLinks = document.querySelectorAll('a[href="MINTERSHIP-FORUM"]');
  mintershipForumLinks.forEach(link => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      if (!userState.isLoggedIn) {
        await login();
      }
      await loadForumPage();
      loadRoomContent("general");
      startPollingForNewMessages();
    });
  });

  const minterBoardLinks = document.querySelectorAll('a[href="MINTER-BOARD"], a[href="MINTERS"]');
  minterBoardLinks.forEach(link => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!userState.isLoggedIn) {
        await login();
      }
      if (typeof loadMinterBoardPage === "undefined") {
        console.log("loadMinterBoardPage not found, loading script dynamically...");
        await loadScript("./assets/js/MinterBoard.js");
      }
      await loadMinterBoardPage();
    });
  });

  // --- ADMIN CHECK ---
  await verifyUserIsAdmin();

  if (userState.isAdmin && (localStorage.getItem('savedAdminData'))) {
    console.log('saved admin data found (Q-Mintership.js), loading...')
    const adminData = localStorage.getItem('savedAdminData')
    const parsedAdminData = JSON.parse(adminData)
    if (!adminPublicKeys || adminPublicKeys.length === 0 || !Array.isArray(adminPublicKeys)) {
      console.log('no adminPublicKey variable data found and/or data did not pass checks, using fetched localStorage data...',adminPublicKeys)
      if (parsedAdminData.publicKeys.length === 0 || !parsedAdminData.publicKeys || !Array.isArray(parsedAdminData.publicKeys)) {
        console.log('loaded data from localStorage also did not pass checks... fetching from API...',parsedAdminData.publicKeys)
        adminPublicKeys = await fetchAdminGroupsMembersPublicKeys()
      } else {
        adminPublicKeys = parsedAdminData.publicKeys
      }
    }
  }

  if (userState.isAdmin) {
    console.log(`User is an Admin. Admin-specific buttons will remain visible.`);

    // DATA-BOARD Links for Admins
    const minterDataBoardLinks = document.querySelectorAll('a[href="ADMINBOARD"]');
    minterDataBoardLinks.forEach(link => {
      link.addEventListener("click", async (event) => {
        event.preventDefault();
        if (!userState.isLoggedIn) {
          await login();
        }
        if (typeof loadAdminBoardPage === "undefined") {
          console.log("loadAdminBoardPage function not found, loading script dynamically...");
          await loadScript("./assets/js/AdminBoard.js");
        }
        await loadAdminBoardPage();
      });
    });

    // TOOLS Links for Admins
    const toolsLinks = document.querySelectorAll('a[href="TOOLS"]');
    toolsLinks.forEach(link => {
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!userState.isLoggedIn) {
          await login();
        }
        if (typeof loadMinterAdminToolsPage === "undefined") {
          console.log("loadMinterAdminToolsPage function not found, loading script dynamically...");
          await loadScript("./assets/js/AdminTools.js");
        }
        await loadMinterAdminToolsPage();
      });
    });

  } else {
    console.log("User is NOT an Admin. Removing admin-specific links.");
    
    // Remove all admin-specific links and their parents
    const toolsLinks = document.querySelectorAll('a[href="TOOLS"], a[href="ADMINBOARD"]');
    toolsLinks.forEach(link => {
      const buttonParent = link.closest('button');
      if (buttonParent) buttonParent.remove();

      const cardParent = link.closest('.item.features-image');
      if (cardParent) cardParent.remove();

      link.remove();
    });

    // Center the remaining card if it exists
    const remainingCard = document.querySelector('.features7 .row .item.features-image');
    if (remainingCard) {
      remainingCard.classList.remove('col-lg-6', 'col-md-6');
      remainingCard.classList.add('col-12', 'text-center');
    }
  }

  console.log("All DOMContentLoaded tasks completed.");
});

async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}


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

    if ((typeof userState.isAdmin === 'undefined') || (!userState.isAdmin)){
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

  if (userState.isAdmin) {
    await loadOrFetchAdminGroupsData()
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
          <button id="add-images-to-publish-button" style="display: none" disabled>Add Images to Multi-Publish</button>
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
  //TODO - maybe turn this into its own function and put it as a button? But for now it's fine to just load the latest message's position by default I think.
  const latestId = latestMessageIdentifiers[room]?.latestIdentifier;
  if (latestId) {
    const page = await findMessagePage(room, latestId, 10)
    currentPage = page;
    await loadMessagesFromQDN(room, currentPage)
    scrollToMessage(latestId.latestIdentifier)
  } else{
    await loadMessagesFromQDN(room, currentPage)
  }
  ;
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

        const container = document.createElement('div')
        container.style = "display: flex; flex-direction: column; align-items: center; margin: 5px;"
        container.append(img, removeButton)
        previewContainer.append(container)
      }
      reader.readAsDataURL(file)
    })
  })

  addToPublishButton.addEventListener('click', () => {
    processSelectedImages(selectedImages, multiResource, room)
    selectedImages = []
    imageFileInput.value = ""
    addToPublishButton.disabled = true
  })

  fileInput.addEventListener('change', (event) => {
    selectedFiles = [...event.target.files]
  })

  sendButton.addEventListener('click', async () => {
    const quill = new Quill('#editor')
    const messageHtml = quill.root.innerHTML.trim()

    if (messageHtml || selectedFiles.length > 0 || selectedImages.length > 0) {
      await handleSendMessage(room, messageHtml, selectedFiles, selectedImages, multiResource)
    }
  })
}

// Process selected images
const processSelectedImages = async (selectedImages, multiResource, room) => {
  
  for (const file of selectedImages) {
    const attachmentID = generateAttachmentID(room, selectedImages.indexOf(file))
  
    multiResource.push({
      name: userState.accountName,
      service: room === "admins" ? "FILE_PRIVATE" : "FILE",
      identifier: attachmentID,
      file: file, // Use encrypted file for admins
    })
  
    attachmentIdentifiers.push({
      name: userState.accountName,
      service: room === "admins" ? "FILE_PRIVATE" : "FILE",
      identifier: attachmentID,
      filename: file.name,
      mimeType: file.type,
    })
  }
}

// Handle send message
const handleSendMessage = async (room, messageHtml, selectedFiles, selectedImages, multiResource) => {
  const messageIdentifier = room === "admins"
    ? `${messageIdentifierPrefix}-${room}-e-${randomID()}`
    : `${messageIdentifierPrefix}-${room}-${randomID()}`

  try {
    // Process selected images
    if (selectedImages.length > 0) {
      await processSelectedImages(selectedImages, multiResource, room)
    }

    // Process selected files
    if (selectedFiles && selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const attachmentID = generateAttachmentID(room, selectedFiles.indexOf(file))

        multiResource.push({
          name: userState.accountName,
          service: room === "admins" ? "FILE_PRIVATE" : "FILE",
          identifier: attachmentID,
          file: file, // Use encrypted file for admins
        })

        attachmentIdentifiers.push({
          name: userState.accountName,
          service: room === "admins" ? "FILE_PRIVATE" : "FILE",
          identifier: attachmentID,
          filename: file.name,
          mimeType: file.type,
        })
      }
    }

    // Build the message object
    const messageObject = {
      messageHtml,
      hasAttachment: multiResource.length > 0,
      attachments: attachmentIdentifiers,
      replyTo: replyToMessageIdentifier || null, // Include replyTo if applicable
    }

    // Encode the message object
    let base64Message = await objectToBase64(messageObject)
    if (!base64Message) {
      base64Message = btoa(JSON.stringify(messageObject))
    }

    if (room === "admins" && userState.isAdmin) {
      console.log("Encrypting message for admins...")
      
      multiResource.push({
        name: userState.accountName,
        service: "MAIL_PRIVATE",
        identifier: messageIdentifier,
        data64: base64Message,
      })
    } else {
      multiResource.push({
        name: userState.accountName,
        service: "BLOG_POST",
        identifier: messageIdentifier,
        data64: base64Message,
      })
    }

    // Publish resources
    if (room === "admins") {
      if (!userState.isAdmin) {
        console.error("User is not an admin or no admin public keys found. Aborting publish.")
        window.alert("You are not authorized to post in the Admin room.")
        return
      }
      console.log("Publishing encrypted resources for Admin room...")
      await publishMultipleResources(multiResource, adminPublicKeys, true)
    } else {
      console.log("Publishing resources for non-admin room...")
      await publishMultipleResources(multiResource)
    }

    // Clear inputs and show success notification
    clearInputs()
    showSuccessNotification()
  } catch (error) {
    console.error("Error sending message:", error)
  }
}


function clearInputs() {
  const quill = new Quill('#editor');

  // Properly reset Quill editor to ensure formatting options don't linger across messages
  quill.setContents([]);
  quill.setSelection(0,0);

  // clear the local file input arrays
  document.getElementById('file-input').value = "";
  document.getElementById('image-input').value = "";
  document.getElementById('preview-container').innerHTML = "";
  
  replyToMessageIdentifier = null;
  multiResource = [];
  attachmentIdentifiers = [];
  selectedImages = [];
  selectedFiles = [];

  // Remove the reply containers
  const replyContainer = document.querySelector(".reply-container");
  if (replyContainer) {
    replyContainer.remove();
  }
}


// Show success notification
const showSuccessNotification = () => {
  const notification = document.createElement('div')
  notification.innerText = "Message published successfully! Please wait for confirmation."
  notification.style.color = "green"
  notification.style.marginTop = "1em"
  document.querySelector(".message-input-section").appendChild(notification);
  alert(`Successfully Published! Please note that messages will not display until after they are CONFIRMED, be patient!`)

  setTimeout(() => {
    notification.remove()
  }, 10000)
}

// Generate unique attachment ID
const generateAttachmentID = (room, fileIndex = null) => {
  const baseID = room === "admins" ? `${messageAttachmentIdentifierPrefix}-${room}-e-${randomID()}` : `${messageAttachmentIdentifierPrefix}-${room}-${randomID()}`
  return fileIndex !== null ? `${baseID}-${fileIndex}` : baseID
}

// --- REFACTORED LOAD MESSAGES AND HELPER FUNCTIONS ---

const findMessagePage = async (room, identifier, limit) => {
  const { service, query } = getServiceAndQuery(room)
 //TODO check that searchSimple change worked.
  const allMessages = await searchSimple(service, query, '', 0, 0, room, 'false')

  const idx = allMessages.findIndex(msg => msg.identifier === identifier)
  if (idx === -1) {
    // Not found, default to last page or page=0
    return 0
  }

  return Math.floor(idx / limit)

}

const loadMessagesFromQDN = async (room, page, isPolling = false) => {
  try {
    const limit = 10
    const offset = page * limit
    console.log(`Loading messages from QDN: room=${room}, page=${page}, offset=${offset}, limit=${limit}`)

    const messagesContainer = document.querySelector("#messages-container")
    if (!messagesContainer) return

    prepareMessageContainer(messagesContainer, isPolling)

    const { service, query } = getServiceAndQuery(room)
    const response = await fetchResourceList(service, query, limit, offset, room)

    console.log(`Fetched ${response.length} message(s) for page ${page}.`)

    if (handleNoMessagesScenario(isPolling, page, response, messagesContainer)) {
      return
    }

    // Re-establish existing identifiers after preparing container
    existingIdentifiers = new Set(
      Array.from(messagesContainer.querySelectorAll('.message-item'))
        .map(item => item.dataset.identifier)
    )

    let mostRecentMessage = getCurrentMostRecentMessage(room)

    const fetchMessages = await fetchAllMessages(response, service, room)

    for (const msg of fetchMessages) {
      if (!msg) continue
      storeMessageInMap(msg)
    }

    const { firstNewMessageIdentifier, updatedMostRecentMessage } = await renderNewMessages(
      fetchMessages,
      existingIdentifiers,
      messagesContainer,
      room,
      mostRecentMessage
    )

    if (firstNewMessageIdentifier && !isPolling) {
      scrollToNewMessages(firstNewMessageIdentifier)
    }

    if (updatedMostRecentMessage) {
      updateLatestMessageIdentifiers(room, updatedMostRecentMessage)
    }

    handleReplyLogic(fetchMessages)

    await updatePaginationControls(room, limit)
  } catch (error) {
    console.error('Error loading messages from QDN:', error)
  }
}

function scrollToMessage(identifier) {
  const targetElement = document.querySelector(`.message-item[data-identifier="${identifier}"]`)
  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

/** Helper Functions (Arrow Functions) **/

const prepareMessageContainer = (messagesContainer, isPolling) => {
  if (!isPolling) {
    messagesContainer.innerHTML = ""
    existingIdentifiers.clear()
  }
}

const getServiceAndQuery = (room) => {
  const service = (room === "admins") ? "MAIL_PRIVATE" : "BLOG_POST"
  const query = (room === "admins") 
    ? `${messageIdentifierPrefix}-${room}-e` 
    : `${messageIdentifierPrefix}-${room}`
  return { service, query }
}

const fetchResourceList = async (service, query, limit, offset, room) => {
  //TODO check
  return await searchSimple(service, query, '', limit, offset, room, 'false')
}

const handleNoMessagesScenario = (isPolling, page, response, messagesContainer) => {
  if (response.length === 0) {
    if (page === 0 && !isPolling) {
      messagesContainer.innerHTML = `<p>No messages found. Be the first to post!</p>`
    }
    return true
  }
  return false
}

const getCurrentMostRecentMessage = (room) => {
  return latestMessageIdentifiers[room]?.latestTimestamp ? latestMessageIdentifiers[room] : null
}

// 1) Convert fetchAllMessages to fully async
const fetchAllMessages = async (response, service, room) => {
  // Instead of returning Promise.all(...) directly,
  // we explicitly map each resource to a try/catch block.
  const messages = await Promise.all(
    response.map(async (resource) => {
      try {
        const msg = await fetchFullMessage(resource, service, room)
        return msg; // This might be null if you do that check in fetchFullMessage
      } catch (err) {
        console.error(`Skipping resource ${resource.identifier} due to error:`, err)
        // Return null so it doesn't break everything
        return null
      }
    })
  )

  // Filter out any that are null/undefined (missing or errored)
  return messages.filter(Boolean)
}


// 2) fetchFullMessage is already async. We keep it async/await-based
const fetchFullMessage = async (resource, service, room) => {
  // 1) Skip if we already have it in memory
  if (messagesById[resource.identifier]) {
    // Possibly also check if the local data is "up to date," //TODO when adding 'edit' ability to messages, will also need to verify timestamp in saved data.
    // but if you trust your local data, skip the fetch entirely.
    console.log(`Skipping fetch. Found in local store: ${resource.identifier}`)
    return messagesById[resource.identifier]
  }
  try {
    // Skip if already displayed
    if (existingIdentifiers.has(resource.identifier)) {
      return null
    }

    console.log(`Fetching message with identifier: ${resource.identifier}`)
    const messageResponse = await qortalRequest({
      action: "FETCH_QDN_RESOURCE",
      name: resource.name,
      service,
      identifier: resource.identifier,
      ...(room === "admins" ? { encoding: "base64" } : {}),
    })

    const timestamp = resource.updated || resource.created
    const formattedTimestamp = await timestampToHumanReadableDate(timestamp)
    const messageObject = await processMessageObject(messageResponse, room)

    const builtMsg = {
      name: resource.name,
      content: messageObject?.messageHtml || "<em>Message content missing</em>",
      date: formattedTimestamp,
      identifier: resource.identifier,
      replyTo: messageObject?.replyTo || null,
      timestamp,
      attachments: messageObject?.attachments || [],
    }

    // 3) Store it in the map so we skip future fetches
    storeMessageInMap(builtMsg)

    return builtMsg
  } catch (error) {
    console.error(`Failed to fetch message ${resource.identifier}: ${error.message}`)
    return {
      name: resource.name,
      content: "<em>Error loading message</em>",
      date: "Unknown",
      identifier: resource.identifier,
      replyTo: null,
      timestamp: resource.updated || resource.created,
      attachments: [],
    }
  }
}

const fetchReplyData = async (service, name, identifier, room, replyTimestamp) => {
  try {

    console.log(`Fetching message with identifier: ${identifier}`)
    const messageResponse = await qortalRequest({
      action: "FETCH_QDN_RESOURCE",
      name,
      service,
      identifier,
      ...(room === "admins" ? { encoding: "base64" } : {}),
    })
    console.log('reply response',messageResponse)
    
    const messageObject = await processMessageObject(messageResponse, room)
    console.log('reply message object',messageObject)
    const formattedTimestamp = await timestampToHumanReadableDate(replyTimestamp)

    return {
      name,
      content: messageObject?.messageHtml || "<em>Message content missing</em>",
      date: formattedTimestamp,
      identifier,
      replyTo: messageObject?.replyTo || null,
      timestamp: replyTimestamp,
      attachments: messageObject?.attachments || [],
    }
  } catch (error) {
    console.error(`Failed to fetch message ${identifier}: ${error.message}`)
    return {
      name,
      content: "<em>Error loading message</em>",
      date: "Unknown",
      identifier,
      replyTo: null,
      timestamp: null,
      attachments: [],
    }
  }
}


const processMessageObject = async (messageResponse, room) => {
  if (room !== "admins") {
    return messageResponse;
  }

  try {
    const decryptedData = await decryptAndParseObject(messageResponse);
    return decryptedData
  } catch (error) {
    console.error(`Failed to decrypt admin message: ${error.message}`);
    return null;
  }
};

const renderNewMessages = async (fetchMessages, existingIdentifiers, messagesContainer, room, mostRecentMessage) => {
  let firstNewMessageIdentifier = null
  let updatedMostRecentMessage = mostRecentMessage

  for (const message of fetchMessages) {
    if (message && !existingIdentifiers.has(message.identifier)) {
      const isNewMessage = isMessageNew(message, mostRecentMessage)
      if (isNewMessage && !firstNewMessageIdentifier) {
        firstNewMessageIdentifier = message.identifier
      }

      const messageHTML = await buildMessageHTML(message, fetchMessages, room, isNewMessage)
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML)

      if (!updatedMostRecentMessage || new Date(message.timestamp) > new Date(updatedMostRecentMessage?.latestTimestamp || 0)) {
        updatedMostRecentMessage = {
          latestIdentifier: message.identifier,
          latestTimestamp: message.timestamp,
        }
      }

      existingIdentifiers.add(message.identifier)
    }
  }

  return { firstNewMessageIdentifier, updatedMostRecentMessage }
}

const isMessageNew = (message, mostRecentMessage) => {
  return !mostRecentMessage || new Date(message.timestamp) > new Date(mostRecentMessage?.latestTimestamp)
}

const buildMessageHTML = async (message, fetchMessages, room, isNewMessage) => {
  const replyHtml = await buildReplyHtml(message, room)
  const attachmentHtml = await buildAttachmentHtml(message, room)
  const avatarUrl = `/arbitrary/THUMBNAIL/${message.name}/qortal_avatar`

  return `
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
  `
}

const buildReplyHtml = async (message, room) => {
  // 1) If no replyTo, skip
  if (!message.replyTo) return ""

  // 2) Decide which QDN service for this room
  const replyService = (room === "admins") ? "MAIL_PRIVATE" : "BLOG_POST"
  const replyIdentifier = message.replyTo

  // 3) Check if we already have a *saved* message
  const savedRepliedToMessage = messagesById[replyIdentifier]
  console.log("savedRepliedToMessage", savedRepliedToMessage)

  // 4) If we do, try to process/decrypt it
  if (savedRepliedToMessage) {
    if (savedRepliedToMessage) {
      // We successfully processed the cached message
      console.log("Using saved message data for reply:", savedRepliedToMessage)
      return `
        <div class="reply-message" style="border-left: 2px solid #ccc; margin-bottom: 0.5vh; padding-left: 1vh;">
          <div class="reply-header">
            In reply to: <span class="reply-username">${savedRepliedToMessage.name}</span>
            <span class="reply-timestamp">${savedRepliedToMessage.date}</span>
          </div>
          <div class="reply-content">${savedRepliedToMessage.content}</div>
        </div>
      `
    } else {
      // The cached message is invalid 
      console.log("Saved message found but processMessageObject returned null. Falling back...")
    }
  }

  // 5) Fallback approach: If we don't have it in memory OR the cached version was invalid
  try {
    const replyData = await searchSimple(replyService, replyIdentifier, "", 1)
    if (!replyData || !replyData.name) {
      console.log("No data found via searchSimple. Skipping reply rendering.")
      return ""
    }

    // We'll use replyData to fetch the actual message from QDN
    const replyName = replyData.name
    const replyTimestamp = replyData.updated || replyData.created
    console.log("message not found in workable form, using searchSimple result =>", replyData)

    // This fetches and decrypts the actual message
    const repliedMessage = await fetchReplyData(replyService, replyName, replyIdentifier, room, replyTimestamp)
    if (!repliedMessage) return ""

    // Now store the final message in the map for next time
    storeMessageInMap(repliedMessage)

    // Return final HTML
    return `
      <div class="reply-message" style="border-left: 2px solid #ccc; margin-bottom: 0.5vh; padding-left: 1vh;">
        <div class="reply-header">
          In reply to: <span class="reply-username">${repliedMessage.name}</span> <span class="reply-timestamp">${repliedMessage.date}</span>
        </div>
        <div class="reply-content">${repliedMessage.content}</div>
      </div>
    `
  } catch (error) {
    throw error
  }
}

const buildAttachmentHtml = async (message, room) => {
  if (!message.attachments || message.attachments.length === 0) {
    return ""
  }

  // Map over attachments -> array of Promises
  const attachmentsHtmlPromises = message.attachments.map(attachment =>
    buildSingleAttachmentHtml(attachment, room)
  )

  // Wait for all Promises to resolve -> array of HTML strings
  const attachmentsHtmlArray = await Promise.all(attachmentsHtmlPromises)

  // Join them into a single string
  return attachmentsHtmlArray.join("")
}

const buildSingleAttachmentHtml = async (attachment, room) => {
  if (room !== "admins" && attachment.mimeType && attachment.mimeType.startsWith('image/')) {
    const imageUrl = `/arbitrary/${attachment.service}/${attachment.name}/${attachment.identifier}`
    return `
      <div class="attachment">
        <img src="${imageUrl}" alt="${attachment.filename}" class="inline-image"/>
        <button onclick="fetchAndSaveAttachment('${attachment.service}', '${attachment.name}', '${attachment.identifier}', '${attachment.filename}', '${attachment.mimeType}')">
        Save ${attachment.filename}
        </button>
      </div>
    `
  } else if 
    (room === "admins" && attachment.mimeType && attachment.mimeType.startsWith('image/')) {
    // const imageUrl = `/arbitrary/${attachment.service}/${attachment.name}/${attachment.identifier}`;
    const decryptedBase64 = await fetchEncryptedImageBase64(attachment.service, attachment.name, attachment.identifier, attachment.mimeType)
    const dataUrl = `data:image/${attachment.mimeType};base64,${decryptedBase64}`
    return `
      <div class="attachment">
        <img src="${dataUrl}" alt="${attachment.filename}" class="inline-image"/>
        <button onclick="fetchAndSaveAttachment('${attachment.service}', '${attachment.name}', '${attachment.identifier}', '${attachment.filename}', '${attachment.mimeType}')">
          Save ${attachment.filename}
        </button>
      </div>
    `

  } else {
    return `
      <div class="attachment">
        <button onclick="fetchAndSaveAttachment('${attachment.service}', '${attachment.name}', '${attachment.identifier}', '${attachment.filename}', '${attachment.mimeType}')">
          Download ${attachment.filename}
        </button>
      </div>
    `
  }
}

const scrollToNewMessages = (firstNewMessageIdentifier) => {
  const newMessageElement = document.querySelector(`.message-item[data-identifier="${firstNewMessageIdentifier}"]`)
  if (newMessageElement) {
    newMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

const updateLatestMessageIdentifiers = (room, mostRecentMessage) => {
  latestMessageIdentifiers[room] = mostRecentMessage
  localStorage.setItem("latestMessageIdentifiers", JSON.stringify(latestMessageIdentifiers))
}

const handleReplyLogic = (fetchMessages) => {
  const replyButtons = document.querySelectorAll(".reply-button")
  replyButtons.forEach(button => {
    button.addEventListener("click", () => {
      const replyToMessageIdentifier = button.dataset.messageIdentifier
      const repliedMessage = fetchMessages.find(m => m && m.identifier === replyToMessageIdentifier)
      if (repliedMessage) {
        showReplyPreview(repliedMessage)
      }
    })
  })
}

const showReplyPreview = (repliedMessage) => {
  replyToMessageIdentifier = repliedMessage.identifier

  const replyContainer = document.createElement("div")
  replyContainer.className = "reply-container"
  replyContainer.innerHTML = `
    <div class="reply-preview" style="border: 1px solid #ccc; padding: 1vh; margin-bottom: 1vh; background-color: black; color: white;">
      <strong>Replying to:</strong> ${repliedMessage.content}
      <button id="cancel-reply" style="float: right; color: red; background-color: black; font-weight: bold;">Cancel</button>
    </div>
  `

  if (!document.querySelector(".reply-container")) {
    const messageInputSection = document.querySelector(".message-input-section")
    if (messageInputSection) {
      messageInputSection.insertBefore(replyContainer, messageInputSection.firstChild)
      document.getElementById("cancel-reply").addEventListener("click", () => {
        replyToMessageIdentifier = null
        replyContainer.remove()
      })
    }
  }

  const messageInputSection = document.querySelector(".message-input-section")
  const editor = document.querySelector(".ql-editor")

  if (messageInputSection) {
    messageInputSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (editor) {
    editor.focus()
  }
}

const updatePaginationControls = async (room, limit) => {
  const totalMessages = room === "admins" ? await searchAllCountOnly(`${messageIdentifierPrefix}-${room}-e`, room) : await searchAllCountOnly(`${messageIdentifierPrefix}-${room}`, room)
  renderPaginationControls(room, totalMessages, limit)
}



// Polling function to check for new messages without clearing existing ones
function startPollingForNewMessages() {
  setInterval(async () => {
    const activeRoom = document.querySelector('.room-title')?.innerText.toLowerCase().split(" ")[0]
    if (activeRoom) {
      await loadMessagesFromQDN(activeRoom, currentPage, true)
    }
  }, 40000)
}

