// NOTE - Change isTestMode to false prior to actual release ---- !important - You may also change identifier if you want to not show older cards.
const isEncryptedTestMode = true
const encryptedCardIdentifierPrefix = "test-MDC"
let isExistingEncryptedCard = false
let existingDecryptedCardData = {}
let existingEncryptedCardIdentifier = {}
let cardMinterName = {}
let existingCardMinterNames = []

console.log("Attempting to load AdminBoard.js");

const loadAdminBoardPage = async () => {
  // Clear existing content on the page
  const bodyChildren = document.body.children;
  for (let i = bodyChildren.length - 1; i >= 0; i--) {
      const child = bodyChildren[i];
      if (!child.classList.contains("menu")) {
      child.remove();
      }
  }

  // Add the "Minter Board" content
  const mainContent = document.createElement("div");
  mainContent.innerHTML = `
    <div class="minter-board-main" style="padding: 20px; text-align: center;">
    <h1 style="color: lightblue;">AdminBoard</h1>
    <p style="font-size: 1.25em;"> The Admin Board is an encrypted card publishing board to keep track of minter data for the Minter Admins. Any Admin may publish a card, and related data, make comments on existing cards, and vote on existing card data in support or not of the name on the card. It is essentially a 'project management' tool to assist the Minter Admins in keeping track of the data related to minters they are adding/removing from the minter group. </p>
    <p> More functionality will be added over time. One of the first features will be the ability to output the existing card data 'decisions', to a json formatted list in order to allow crowetic to run his script easily until the final Mintership proposal changes are completed, and the MINTER group is transferred to 'null'.</p>
    <button id="publish-card-button" class="publish-card-button" style="margin: 20px; padding: 10px;">Publish Encrypted Card</button>
    <button id="refresh-cards-button" class="refresh-cards-button" style="padding: 10px;">Refresh Cards</button>
    <div id="encrypted-cards-container" class="cards-container" style="margin-top: 20px;"></div>
    <div id="publish-card-view" class="publish-card-view" style="display: none; text-align: left; padding: 20px;">
        <form id="publish-card-form">
        <h3>Create or Update Your Minter Card</h3>
        <label for="minter-name-input">Minter Name:</label>
        <input type="text" id="minter-name-input" maxlength="100" placeholder="Enter Minter's Name" required>
        <label for="card-header">Header:</label>
        <input type="text" id="card-header" maxlength="100" placeholder="Explain main point/issue" required>
        <label for="card-content">Content:</label>
        <textarea id="card-content" placeholder="Enter any information you like...You may also attach links to more in-depth information, etc." required></textarea>
        <label for="card-links">Links (qortal://...):</label>
        <div id="links-container">
            <input type="text" class="card-link" placeholder="Enter QDN link">
        </div>
        <button type="button" id="add-link-button">Add Another Link</button>
        <button type="submit" id="submit-publish-button">Publish Card</button>
        <button type="button" id="cancel-publish-button">Cancel</button>
        </form>
    </div>
    </div>
  `;
  document.body.appendChild(mainContent);
  const publishCardButton = document.getElementById("publish-card-button")
  if (publishCardButton) {
    publishCardButton.addEventListener("click", async () => {
      const publishCardView = document.getElementById("publish-card-view")
      publishCardView.style.display = "flex"
      document.getElementById("encrypted-cards-container").style.display = "none"
    })
  }
  const refreshCardsButton = document.getElementById("refresh-cards-button")
  if (refreshCardsButton) {
    refreshCardsButton.addEventListener("click", async () => {
      const encryptedCardsContainer = document.getElementById("encrypted-cards-container")
      encryptedCardsContainer.innerHTML = "<p>Refreshing cards...</p>"
      await fetchAllEncryptedCards()
    })
  }   
  
  const cancelPublishButton = document.getElementById("cancel-publish-button")
  if (cancelPublishButton) {
    cancelPublishButton.addEventListener("click", async () => {
      const encryptedCardsContainer = document.getElementById("encrypted-cards-container")
      encryptedCardsContainer.style.display = "flex"; // Restore visibility
      const publishCardView = document.getElementById("publish-card-view")
      publishCardView.style.display = "none"; // Hide the publish form
    })
  }
  const addLinkButton = document.getElementById("add-link-button")
  if (addLinkButton) {
    addLinkButton.addEventListener("click", async () => {
      const linksContainer = document.getElementById("links-container")
      const newLinkInput = document.createElement("input")
      newLinkInput.type = "text"
      newLinkInput.className = "card-link"
      newLinkInput.placeholder = "Enter QDN link"
      linksContainer.appendChild(newLinkInput)
    })
  }

  document.getElementById("publish-card-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await publishEncryptedCard();
  });

  // await fetchAndValidateAllAdminCards();
  await fetchAllEncryptedCards();
}

const extractCardsMinterName = (cardIdentifier) => {
  // Ensure the identifier starts with the prefix
  if (!cardIdentifier.startsWith(`${encryptedCardIdentifierPrefix}-`)) {
    throw new Error('Invalid identifier format or prefix mismatch');
  }
  // Split the identifier into parts
  const parts = cardIdentifier.split('-');
  // Ensure the format has at least 3 parts
  if (parts.length < 3) {
    throw new Error('Invalid identifier format');
  }
  // Extract minterName (everything from the second part to the second-to-last part)
  const minterName = parts.slice(2, -1).join('-');
  // Return the extracted minterName
  return minterName;
}

const processCards = async (validEncryptedCards) => {
  const latestCardsMap = new Map()

  // Step 1: Filter and keep the most recent card per identifier
  validEncryptedCards.forEach(card => {
    const timestamp = card.updated || card.created || 0
    const existingCard = latestCardsMap.get(card.identifier)

    if (!existingCard || timestamp > (existingCard.updated || existingCard.created || 0)) {
      latestCardsMap.set(card.identifier, card)
    }
  })

  // Step 2: Extract unique cards
  const uniqueValidCards = Array.from(latestCardsMap.values())

  // Step 3: Group by minterName and select the most recent card per minterName
  const minterNameMap = new Map()

  for (const card of validEncryptedCards) {
    const minterName = await extractCardsMinterName(card.identifier)
    const existingCard = minterNameMap.get(minterName)
    const cardTimestamp = card.updated || card.created || 0
    const existingTimestamp = existingCard?.updated || existingCard?.created || 0

    if (!existingCardMinterNames.includes(minterName)) {
      existingCardMinterNames.push(minterName)
      console.log(`cardsMinterName: ${minterName} - added to list`)
    }

    // Keep only the most recent card for each minterName
    if (!existingCard || cardTimestamp > existingTimestamp) {
      minterNameMap.set(minterName, card)
    }
  }

  // Step 4: Filter cards to ensure each minterName is included only once
  const finalCards = []
  const seenMinterNames = new Set()

  for (const [minterName, card] of minterNameMap.entries()) {
    if (!seenMinterNames.has(minterName)) {
      finalCards.push(card)
      seenMinterNames.add(minterName) // Mark the minterName as seen
    }
  }

  // Step 5: Sort by the most recent timestamp
  finalCards.sort((a, b) => {
    const timestampA = a.updated || a.created || 0
    const timestampB = b.updated || b.created || 0
    return timestampB - timestampA
  })

  return finalCards
}


//Main function to load the Minter Cards ----------------------------------------
const fetchAllEncryptedCards = async () => {
  const encryptedCardsContainer = document.getElementById("encrypted-cards-container");
  encryptedCardsContainer.innerHTML = "<p>Loading cards...</p>";

  try {
    const response = await qortalRequest({
      action: "SEARCH_QDN_RESOURCES",
      service: "MAIL_PRIVATE",
      query: encryptedCardIdentifierPrefix,
      mode: "ALL"
    });

    if (!response || !Array.isArray(response) || response.length === 0) {
      encryptedCardsContainer.innerHTML = "<p>No cards found.</p>";
      return;
    }

    // Validate cards and filter
    const validatedEncryptedCards = await Promise.all(
      response.map(async card => {
        const isValid = await validateEncryptedCardIdentifier(card);
        return isValid ? card : null;
      })
    );

    const validEncryptedCards = validatedEncryptedCards.filter(card => card !== null);
    
    if (validEncryptedCards.length === 0) {
      encryptedCardsContainer.innerHTML = "<p>No valid cards found.</p>";
      return;
    }
    const finalCards = await processCards(validEncryptedCards)

    // Display skeleton cards immediately
    encryptedCardsContainer.innerHTML = "";
    finalCards.forEach(card => {
      const skeletonHTML = createSkeletonCardHTML(card.identifier);
      encryptedCardsContainer.insertAdjacentHTML("beforeend", skeletonHTML);
    });

    // Fetch and update each card
    finalCards.forEach(async card => {
      try {
        const cardDataResponse = await qortalRequest({
          action: "FETCH_QDN_RESOURCE",
          name: card.name,
          service: "MAIL_PRIVATE",
          identifier: card.identifier,
          encoding: "base64"
        });

        if (!cardDataResponse) {
          console.warn(`Skipping invalid card: ${JSON.stringify(card)}`);
          removeSkeleton(card.identifier);
          return;
        }

        const decryptedCardData = await decryptAndParseObject(cardDataResponse);

        // Skip cards without polls
        if (!decryptedCardData.poll) {
          console.warn(`Skipping card with no poll: ${card.identifier}`);
          removeSkeleton(card.identifier);
          return;
        }

        // Fetch poll results
        const pollResults = await fetchPollResults(decryptedCardData.poll);
        const minterNameFromIdentifier = await extractCardsMinterName(card.identifier);
        const encryptedCommentCount = await getEncryptedCommentCount(card.identifier);
        // Generate final card HTML
        const finalCardHTML = await createEncryptedCardHTML(decryptedCardData, pollResults, card.identifier, encryptedCommentCount);
        replaceEncryptedSkeleton(card.identifier, finalCardHTML);
      } catch (error) {
        console.error(`Error processing card ${card.identifier}:`, error);
        removeEncryptedSkeleton(card.identifier); // Silently remove skeleton on error
      }
    });

  } catch (error) {
    console.error("Error loading cards:", error);
    encryptedCardsContainer.innerHTML = "<p>Failed to load cards.</p>";
  }
};


const removeEncryptedSkeleton = (cardIdentifier) => {
  const encryptedSkeletonCard = document.getElementById(`skeleton-${cardIdentifier}`);
  if (encryptedSkeletonCard) {
    encryptedSkeletonCard.remove(); // Remove the skeleton silently
  }
};

const replaceEncryptedSkeleton = (cardIdentifier, htmlContent) => {
  const encryptedSkeletonCard = document.getElementById(`skeleton-${cardIdentifier}`);
  if (encryptedSkeletonCard) {
    encryptedSkeletonCard.outerHTML = htmlContent;
  }
};

// Function to create a skeleton card
const createEncryptedSkeletonCardHTML = (cardIdentifier) => {
  return `
    <div id="skeleton-${cardIdentifier}" class="skeleton-card" style="padding: 10px; border: 1px solid gray; margin: 10px 0;">
      <div style="display: flex; align-items: center;">
        <div style="width: 50px; height: 50px; background-color: #ccc; border-radius: 50%;"></div>
        <div style="margin-left: 10px;">
          <div style="width: 120px; height: 20px; background-color: #ccc; margin-bottom: 5px;"></div>
          <div style="width: 80px; height: 15px; background-color: #ddd;"></div>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <div style="width: 100%; height: 40px; background-color: #eee;"></div>
      </div>
    </div>
  `;
};


// Function to check and fech an existing Minter Card if attempting to publish twice ----------------------------------------
const fetchExistingEncryptedCard = async (minterName) => {
  try {
    // Step 1: Perform the search
    const response = await qortalRequest({
      action: "SEARCH_QDN_RESOURCES",
      service: "MAIL_PRIVATE",
      identifier: encryptedCardIdentifierPrefix,
      query: minterName,
      mode: "ALL", 
    });

    console.log(`SEARCH_QDN_RESOURCES response: ${JSON.stringify(response, null, 2)}`);

    // Step 2: Check if the response is an array and not empty
    if (!response || !Array.isArray(response) || response.length === 0) {
      console.log("No cards found for the current user.");
      return null;
    }

    // Step 3: Validate cards asynchronously
    const validatedCards = await Promise.all(
      response.map(async card => {
        const isValid = await validateEncryptedCardIdentifier(card)
        return isValid ? card : null;
      })
    );

    // Step 4: Filter out invalid cards
    const validCards = validatedCards.filter(card => card !== null);

    if (validCards.length > 0) {
      // Step 5: Sort by most recent timestamp
      const mostRecentCard = validCards.sort((a, b) => b.created - a.created)[0];

      // Step 6: Fetch full card data
      const cardDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: mostRecentCard.name, 
        service: mostRecentCard.service,
        identifier: mostRecentCard.identifier,
        encoding: "base64"
      });

      existingEncryptedCardIdentifier = mostRecentCard.identifier;

      existingDecryptedCardData = await decryptAndParseObject(cardDataResponse)
      console.log("Full card data fetched successfully:", existingDecryptedCardData);

      return existingDecryptedCardData;
    }

    console.log("No valid cards found.");
    return null;
  } catch (error) {
    console.error("Error fetching existing card:", error);
    return null;
  }
};

// Validate that a card is indeed a card and not a comment. -------------------------------------
const validateEncryptedCardIdentifier = async (card) => {
  return (
    typeof card === "object" &&
    card.name &&
    card.service === "MAIL_PRIVATE" &&
    card.identifier && !card.identifier.includes("comment") &&
    card.created
  );
}

// Load existing card data passed, into the form for editing -------------------------------------
const loadEncryptedCardIntoForm = async () => {
  if (existingDecryptedCardData) {
    console.log("Loading existing card data:", existingDecryptedCardData);
    document.getElementById("minter-name-input").value = existingDecryptedCardData.minterName
    document.getElementById("card-header").value = existingDecryptedCardData.header
    document.getElementById("card-content").value = existingDecryptedCardData.content

    const linksContainer = document.getElementById("links-container");
    linksContainer.innerHTML = ""; // Clear previous links
    existingDecryptedCardData.links.forEach(link => {
      const linkInput = document.createElement("input");
      linkInput.type = "text";
      linkInput.className = "card-link";
      linkInput.value = link;
      linksContainer.appendChild(linkInput);
    });
  }
}

const validateMinterName = async(minterName) => {
  try {
    const nameInfo =  await getNameInfo(minterName)
    if (!nameInfo) {
        return error (`No NameInfo able to be obtained? Did you pass name?`)
    }
    const name = nameInfo.name
    return name
  } catch (error){
      console.error(`extracting name from name info: ${minterName} failed.`, error)
  }
}

// Main function to publish a new Minter Card -----------------------------------------------
const publishEncryptedCard = async () => {
  const minterNameInput = document.getElementById("minter-name-input").value.trim();
  const header = document.getElementById("card-header").value.trim();
  const content = document.getElementById("card-content").value.trim();
  const links = Array.from(document.querySelectorAll(".card-link"))
    .map(input => input.value.trim())
    .filter(link => link.startsWith("qortal://"));
  const publishedMinterName = await validateMinterName(minterNameInput)

  if (!header || !content) {
    alert("Header and Content are required!");
    return;
  }

  if (!publishedMinterName) {
    alert(`Minter name invalid! Name input: ${minterNameInput} - please check the name and try again!`)
    return;
  }

  if (!isExistingEncryptedCard) {
    if (existingCardMinterNames.includes(publishedMinterName)) {
      const updateCard = confirm(`Minter Name: ${publishedMinterName} - CARD ALREADY EXISTS, you can update it (overwriting existing publish) or cancel... `)
      if (updateCard) {
        await fetchExistingEncryptedCard(publishedMinterName)
        await loadEncryptedCardIntoForm()
        isExistingEncryptedCard = true
        return
      }else {
      return;
      }
    }
  }

  const cardIdentifier = isExistingEncryptedCard ? existingEncryptedCardIdentifier : `${encryptedCardIdentifierPrefix}-${publishedMinterName}-${await uid()}`;
  const pollName = `${cardIdentifier}-poll`;
  const pollDescription = `Admin Board Poll Published By ${userState.accountName}`;

  const cardData = {
    minterName: `${publishedMinterName}`,
    header,
    content,
    links,
    creator: userState.accountName,
    timestamp: Date.now(),
    poll: pollName,
  };
  
  try {

    let base64CardData = await objectToBase64(cardData);
    if (!base64CardData) {
      console.log(`initial base64 object creation with objectToBase64 failed, using btoa...`);
      base64CardData = btoa(JSON.stringify(cardData));
    }
    
    
    const verifiedAdminPublicKeys = await fetchAdminGroupsMembersPublicKeys()
    adminPublicKeys = verifiedAdminPublicKeys
    
    await qortalRequest({
      action: "PUBLISH_QDN_RESOURCE",
      name: userState.accountName,
      service: "MAIL_PRIVATE",
      identifier: cardIdentifier,
      data64: base64CardData,
      encrypt: true,
      publicKeys: verifiedAdminPublicKeys
    });

    if (!isExistingEncryptedCard){
    await qortalRequest({
      action: "CREATE_POLL",
      pollName,
      pollDescription,
      pollOptions: ['Yes, No'],
      pollOwnerAddress: userState.accountAddress,
    });

    alert("Card and poll published successfully!");
    existingCardMinterNames.push(`${publishedMinterName}`)
    }

    if (isExistingEncryptedCard){
      alert("Card Updated Successfully! (No poll updates are possible at this time...)")
    }
    document.getElementById("publish-card-form").reset();
    document.getElementById("publish-card-view").style.display = "none";
    document.getElementById("encrypted-cards-container").style.display = "flex";
  } catch (error) {
    console.error("Error publishing card or poll:", error);
    alert("Failed to publish card and poll.");
  }
}

const getEncryptedCommentCount = async (cardIdentifier) => {
  try {
    const response = await qortalRequest({
      action: 'SEARCH_QDN_RESOURCES',
      service: 'MAIL_PRIVATE',
      query: `comment-${cardIdentifier}`,
      mode: "ALL"
    });
    // Just return the count; no need to decrypt each comment here
    return Array.isArray(response) ? response.length : 0;
  } catch (error) {
    console.error(`Error fetching comment count for ${cardIdentifier}:`, error);
    return 0;
  }
};

// Post a comment on a card. ---------------------------------
const postEncryptedComment = async (cardIdentifier) => {
  const commentInput = document.getElementById(`new-comment-${cardIdentifier}`);
  const commentText = commentInput.value.trim();
  if (!commentText) {
    alert('Comment cannot be empty!');
    return;
  }

  const postTimestamp = Date.now()
  console.log(`timestmp to be posted: ${postTimestamp}`)

  const commentData = {
    content: commentText,
    creator: userState.accountName,
    timestamp: postTimestamp,
  };

  const commentIdentifier = `comment-${cardIdentifier}-${await uid()}`;

  if (!Array.isArray(adminPublicKeys) || (adminPublicKeys.length === 0)) {
    const verifiedAdminPublicKeys = await fetchAdminGroupsMembersPublicKeys()
    adminPublicKeys = verifiedAdminPublicKeys
  }


  try {
  const base64CommentData = await objectToBase64(commentData);
    if (!base64CommentData) {
      console.log(`initial base64 object creation with objectToBase64 failed, using btoa...`);
      base64CommentData = btoa(JSON.stringify(commentData));
    }
  
  await qortalRequest({
    action: "PUBLISH_QDN_RESOURCE",
    name: userState.accountName,
    service: "MAIL_PRIVATE",
    identifier: commentIdentifier,
    data64: base64CommentData,
    encrypt: true,
    publicKeys: adminPublicKeys
  });

  alert('Comment posted successfully!');
  commentInput.value = ''; // Clear input
  } catch (error) {
    console.error('Error posting comment:', error);
    alert('Failed to post comment.');
  }
};

//Fetch the comments for a card with passed card identifier ----------------------------
const fetchEncryptedComments = async (cardIdentifier) => {
  try {
    const response = await qortalRequest({
      action: 'SEARCH_QDN_RESOURCES',
      service: 'MAIL_PRIVATE',
      query: `comment-${cardIdentifier}`,
      mode: "ALL"
    });

    return response;
  } catch (error) {
    console.error(`Error fetching comments for ${cardIdentifier}:`, error);
    return [];
  }
};

// display the comments on the card, with passed cardIdentifier to identify the card --------------
const displayEncryptedComments = async (cardIdentifier) => {
  try {
    const comments = await fetchEncryptedComments(cardIdentifier);
    const commentsContainer = document.getElementById(`comments-container-${cardIdentifier}`);

    // Fetch and display each comment
    for (const comment of comments) {
      const commentDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: comment.name,
        service: "MAIL_PRIVATE",
        identifier: comment.identifier,
        encoding: "base64"
      });

      const decryptedCommentData = await decryptAndParseObject(commentDataResponse)

      const timestampCheck = comment.updated || comment.created || 0
      const timestamp = await timestampToHumanReadableDate(timestampCheck);

      //TODO - add fetching of poll results and checking to see if the commenter has voted and display it as 'supports minter' section.
      const commentHTML = `
        <div class="comment" style="border: 1px solid gray; margin: 1vh 0; padding: 1vh; background: #1c1c1c;">
          <p><strong><u>${decryptedCommentData.creator}</strong>:</p></u>
          <p>${decryptedCommentData.content}</p>
          <p><i>${timestamp}</p></i>
        </div>
      `;
      commentsContainer.insertAdjacentHTML('beforeend', commentHTML);
    }
  } catch (error) {
    console.error(`Error displaying comments for ${cardIdentifier}:`, error);
    alert("Failed to load comments. Please try again.");
  }
};

const calculateAdminBoardPollResults = async (pollData, minterGroupMembers, minterAdmins) => {
  const memberAddresses = minterGroupMembers.map(member => member.member)
  const minterAdminAddresses = minterAdmins.map(member => member.member)
  const adminGroupsMembers = await fetchAllAdminGroupsMembers()
  const groupAdminAddresses = adminGroupsMembers.map(member => member.member)
  const adminAddresses = [];
  adminAddresses.push(...minterAdminAddresses,...groupAdminAddresses);

  let adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, yesWeight = 0 , noWeight = 0

  pollData.voteWeights.forEach(weightData => {
    if (weightData.optionName === 'Yes') {
      yesWeight = weightData.voteWeight
    } else if (weightData.optionName === 'No') {
      noWeight = weightData.voteWeight
    }
  })

  for (const vote of pollData.votes) {
    const voterAddress = await getAddressFromPublicKey(vote.voterPublicKey)
    console.log(`voter address: ${voterAddress}`)

    if (vote.optionIndex === 0) {
      adminAddresses.includes(voterAddress) ? adminYes++ : memberAddresses.includes(voterAddress) ? minterYes++ : console.log(`voter ${voterAddress} is not a minter nor an admin...Not including results...`)
    } else if (vote.optionIndex === 1) {
      adminAddresses.includes(voterAddress) ? adminNo++ : memberAddresses.includes(voterAddress) ? minterNo++ : console.log(`voter ${voterAddress} is not a minter nor an admin...Not including results...`)
    }
  }

  // TODO - create a new function to calculate the weights of each voting MINTER only. 
  // This will give ALL weight whether voter is in minter group or not... 
  // until that is changed on the core we must calculate manually. 
  const totalYesWeight = yesWeight
  const totalNoWeight = noWeight

  const totalYes = adminYes + minterYes
  const totalNo = adminNo + minterNo

  return { adminYes, adminNo, minterYes, minterNo, totalYes, totalNo, totalYesWeight, totalNoWeight }
}

const toggleEncryptedComments = async (cardIdentifier) => {
  const commentsSection = document.getElementById(`comments-section-${cardIdentifier}`);
  if (commentsSection.style.display === 'none' || !commentsSection.style.display) {
    await displayEncryptedComments(cardIdentifier);
    commentsSection.style.display = 'block';
  } else {
    commentsSection.style.display = 'none';
  }
};

const createLinkDisplayModal = async () => {
  const modalHTML = `
    <div id="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 1000;">
      <div style="position: relative; margin: 10% auto; width: 95%; height: 80%; background: white; border-radius: 10px; overflow: hidden;">
        <iframe id="modalContent" src="" style="width: 100%; height: 100%; border: none;"></iframe>
        <button onclick="closeLinkDisplayModal()" style="position: absolute; top: 10px; right: 10px; background: red; color: white; border: none; padding: 5px 10px; border-radius: 5px;">Close</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Function to open the modal
const openLinkDisplayModal = async (link) => {
  const processedLink = await processQortalLinkForRendering(link) // Process the link to replace `qortal://` for rendering in modal
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  modalContent.src = processedLink; // Set the iframe source to the link
  modal.style.display = 'block'; // Show the modal
}

// Function to close the modal
const closeLinkDisplayModal = async () => {
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  modal.style.display = 'none'; // Hide the modal
  modalContent.src = ''; // Clear the iframe source
}

// const processQortalLinkForRendering = async (link) => {
//   if (link.startsWith('qortal://')) {
//     const match = link.match(/^qortal:\/\/([^/]+)(\/.*)?$/);
//     if (match) {
//       const firstParam = match[1].toUpperCase(); // Convert to uppercase
//       const remainingPath = match[2] || ""; // Rest of the URL
//       // Perform any asynchronous operation if necessary
//       await new Promise(resolve => setTimeout(resolve, 10)); // Simulating async operation
//       return `/render/${firstParam}${remainingPath}`;
//     }
//   }
//   return link; // Return unchanged if not a Qortal link
// }

const processQortalLinkForRendering = async (link) => {
  if (link.startsWith('qortal://')) {
    const match = link.match(/^qortal:\/\/([^/]+)(\/.*)?$/);
    if (match) {
      const firstParam = match[1].toUpperCase(); 
      const remainingPath = match[2] || ""; 
      const themeColor = window._qdnTheme || 'default'; // Fallback to 'default' if undefined

      // Simulating async operation if needed
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Append theme as a query parameter
      return `/render/${firstParam}${remainingPath}?theme=${themeColor}`;
    }
  }
  return link;
};

async function getMinterAvatar(minterName) {
  const avatarUrl = `/arbitrary/THUMBNAIL/${minterName}/qortal_avatar`;
  
  try {
    const response = await fetch(avatarUrl, { method: 'HEAD' });
    if (response.ok) {
      // Avatar exists, return the image HTML
      return `<img src="${avatarUrl}" alt="User Avatar" class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; align-self: center;">`;
    } else {
      // Avatar not found or no permission
      return '';
    }
  } catch (error) {
    console.error('Error checking avatar availability:', error);
    return '';
  }
}

// Create the overall Minter Card HTML -----------------------------------------------
const createEncryptedCardHTML = async (cardData, pollResults, cardIdentifier, commentCount) => {
  const { minterName, header, content, links, creator, timestamp, poll } = cardData;
  const formattedDate = new Date(timestamp).toLocaleString();
  const minterAvatar = await getMinterAvatar(minterName)
  // const creatorAvatar = `/arbitrary/THUMBNAIL/${creator}/qortal_avatar`;
  const creatorAvatar = await getMinterAvatar(creator)
  const linksHTML = links.map((link, index) => `
    <button onclick="openLinkDisplayModal('${link}')">
      ${`Link ${index + 1} - ${link}`}
    </button>
  `).join("");

  const minterGroupMembers = await fetchMinterGroupMembers();
  const minterAdmins = await fetchMinterGroupAdmins();
  const { adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, totalYes = 0, totalNo = 0, totalYesWeight = 0, totalNoWeight = 0 } = await calculateAdminBoardPollResults(pollResults, minterGroupMembers, minterAdmins)
  await createModal()
  return `
  <div class="admin-card">
    <div class="minter-card-header">
      <h2 class="support-header"> Created By: </h2>
      ${creatorAvatar}
      <h2>${creator}</h2>
      <div class="support-header"><h5> REGARDING: </h5></div>
      ${minterAvatar}
      <h3>${minterName}</h3>
      <p>${header}</p>
    </div>
    <div class="info">
      ${content}
    </div>
    <div class="support-header"><h5>LINKS</h5></div>
    <div class="info-links">
      ${linksHTML}
    </div>
    <div class="results-header support-header"><h5>CURRENT RESULTS</h5></div>
    <div class="minter-card-results">
      <div class="admin-results">
        <span class="admin-yes">Admin Support: ${adminYes}</span>
        <span class="admin-no">Admin Against: ${adminNo}</span>
      </div>
      <div class="minter-results">
        <span class="minter-yes">Supporting Weight ${totalYesWeight}</span>
        <span class="minter-no">Denial Weight ${totalNoWeight}</span>
      </div>
    </div>
    <div class="support-header"><h5>SUPPORT or DENY</h5><h5 style="color: #ffae42;">${minterName}</h5>
    <p style="color: #c7c7c7; font-size: .65rem; margin-top: 1vh">(click COMMENTS button to open/close card comments)</p>
    </div>
    <div class="actions">
      <div class="actions-buttons">
        <button class="yes" onclick="voteYesOnPoll('${poll}')">SUPPORT</button>
        <button class="comment" onclick="toggleEncryptedComments('${cardIdentifier}')">COMMENTS (${commentCount})</button>
        <button class="no" onclick="voteNoOnPoll('${poll}')">OPPOSE</button>
      </div>
    </div>
    <div id="comments-section-${cardIdentifier}" class="comments-section" style="display: none; margin-top: 20px;">
      <div id="comments-container-${cardIdentifier}" class="comments-container"></div>
      <textarea id="new-comment-${cardIdentifier}" placeholder="Input your comment..." style="width: 100%; margin-top: 10px;"></textarea>
      <button onclick="postEncryptedComment('${cardIdentifier}')">Post Comment</button>
    </div>
    <p style="font-size: 0.75rem; margin-top: 1vh; color: #4496a1">By: ${creator} - ${formattedDate}</p>
  </div>
  `;
}

