// const cardIdentifierPrefix = "test-board-card"
const testMode = true;
const cardIdentifierPrefix = "test-mData-card";
let isExistingCard = false;
let existingCardData = {};
let existingCardIdentifier = {};

const isAdmin = await verifyUserIsAdmin()
  
document.addEventListener("DOMContentLoaded", async () => {
// Verify admin status and hide/show buttons
if (await isAdmin()) {
    document.addEventListener("DOMContentLoaded", async () => {
        const minterBoardLinks = document.querySelectorAll('a[href="MINTER-DATA-BOARD"], a[href="DATA-BOARD"]');
        
        minterBoardLinks.forEach(link => {
            link.addEventListener("click", async (event) => {
            event.preventDefault();
            if (!userState.isLoggedIn) {
                await login();
            }
            await loadMinterDataBoardPage();
            });
        });
        });
    }
})

const loadMinterDataBoardPage = async () => {
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
      <h1 style="color: lightblue;">Minter Board</h1>
      <p style="font-size: 1.25em;"> The Minter Data Board is an encrypted card publishing board to keep track of minter data for the Minter Admins. Any Admin may publish a card, and related data, make comments on existing cards, and vote on existing card data in support or not of the name on the card. </p>
      <button id="publish-card-button" class="publish-card-button" style="margin: 20px; padding: 10px;">Publish Encrypted Card</button>
      <button id="refresh-cards-button" class="refresh-cards-button" style="padding: 10px;">Refresh Cards</button>
      <div id="cards-container" class="cards-container" style="margin-top: 20px;"></div>
      <div id="publish-card-view" class="publish-card-view" style="display: none; text-align: left; padding: 20px;">
        <form id="publish-card-form">
          <h3>Create or Update Your Minter Card</h3>
          <label for="card-header">Header:</label>
          <input type="text" id="card-header" maxlength="100" placeholder="Enter card header" required>
          <label for="card-content">Content:</label>
          <textarea id="card-content" placeholder="Enter detailed information about why you deserve to be a minter..." required></textarea>
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

  document.getElementById("publish-card-button").addEventListener("click", async () => {
    try {
      const fetchedCard = await checkDuplicateEncryptedCard();
      if (fetchedCard) {
        // An existing card is found
        if (testMode) {
          // In test mode, ask user what to do
          const updateCard = confirm("A card already exists. Do you want to update it? Note, updating it will overwrite the data of the original publisher, only do this if necessary!");
          if (updateCard) {
            isExistingCard = true;
            await loadEncryptedCardIntoForm(existingCardData);
            alert("Edit the existing ");
          } else {
            alert("Test mode: You can now create a new card.");
            isExistingCard = false;
            existingCardData = {}; // Reset
            document.getElementById("publish-card-form").reset();
          }
        } else {
          // Not in test mode, force editing
          alert("A card already exists. Publishing of multiple cards for the same minter is not allowed, either use existing card or update it.");
          isExistingCard = true;
          await loadEncryptedCardIntoForm(existingCardData);
        }
      } else {
        // No existing card found
        alert("No existing card found. Create a new card.");
        isExistingCard = false;
      }

      // Show the form
      const publishCardView = document.getElementById("publish-card-view");
      publishCardView.style.display = "flex";
      document.getElementById("cards-container").style.display = "none";
    } catch (error) {
      console.error("Error checking for existing card:", error);
      alert("Failed to check for existing card. Please try again.");
    }
  });

  const checkDuplicateEncryptedCard = async (minterName) => {
    const response = await qortalRequest({
      action: "SEARCH_QDN_RESOURCES",
      service: "MAIL_PRIVATE",
      query: `${cardIdentifierPrefix}-${minterName}`,
      mode: "ALL",
    });
    return response && response.length > 0;
  };

  document.getElementById("refresh-cards-button").addEventListener("click", async () => {
    const cardsContainer = document.getElementById("cards-container");
    cardsContainer.innerHTML = "<p>Refreshing cards...</p>";
    await fetchEncryptedCards();
  });
  

  document.getElementById("cancel-publish-button").addEventListener("click", async () => {
    const cardsContainer = document.getElementById("cards-container");
    cardsContainer.style.display = "flex"; // Restore visibility
    const publishCardView = document.getElementById("publish-card-view");
    publishCardView.style.display = "none"; // Hide the publish form
  });

  document.getElementById("add-link-button").addEventListener("click", async () => {
    const linksContainer = document.getElementById("links-container");
    const newLinkInput = document.createElement("input");
    newLinkInput.type = "text";
    newLinkInput.className = "card-link";
    newLinkInput.placeholder = "Enter QDN link";
    linksContainer.appendChild(newLinkInput);
  });

  document.getElementById("publish-card-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await publishEncryptedCard();
  });

  await fetchEncryptedCards();
}

//Main function to load the Minter Cards ----------------------------------------
const fetchEncryptedCards = async () => {
  const cardsContainer = document.getElementById("cards-container");
  cardsContainer.innerHTML = "<p>Loading cards...</p>";

  try {
    const response = await qortalRequest({
      action: "SEARCH_QDN_RESOURCES",
      service: "MAIL_PRIVATE",
      query: cardIdentifierPrefix,
      mode: "ALL"
    });

    if (!response || !Array.isArray(response) || response.length === 0) {
      cardsContainer.innerHTML = "<p>No cards found.</p>";
      return;
    }

    // Validate cards and filter
    const validatedCards = await Promise.all(
      response.map(async card => {
        const isValid = await validateEncryptedCardStructure(card);
        return isValid ? card : null;
      })
    );

    const validCards = validatedCards.filter(card => card !== null);

    if (validCards.length === 0) {
      cardsContainer.innerHTML = "<p>No valid cards found.</p>";
      return;
    }

    // Sort cards by timestamp descending (newest first)
    validCards.sort((a, b) => {
      const timestampA = a.updated || a.created || 0;
      const timestampB = b.updated || b.created || 0;
      return timestampB - timestampA;
    });

    // Display skeleton cards immediately
    cardsContainer.innerHTML = "";
    validCards.forEach(card => {
      const skeletonHTML = createSkeletonCardHTML(card.identifier);
      cardsContainer.insertAdjacentHTML("beforeend", skeletonHTML);
    });

    // Fetch and update each card
    validCards.forEach(async card => {
      try {
        const cardDataResponse = await qortalRequest({
          action: "FETCH_QDN_RESOURCE",
          name: card.name,
          service: "MAIL_PRIVATE",
          identifier: card.identifier,
        });
    
        if (!cardDataResponse) {
          console.warn(`Skipping invalid card: ${JSON.stringify(card)}`);
          removeSkeleton(card.identifier);
          return;
        }
    
        // Skip cards without polls
        if (!cardDataResponse.poll) {
          console.warn(`Skipping card with no poll: ${card.identifier}`);
          removeSkeleton(card.identifier);
          return;
        }
    
        // Fetch poll results
        const pollResults = await fetchPollResults(cardDataResponse.poll);
    
        // Generate final card HTML
        const finalCardHTML = await createCardHTML(cardDataResponse, pollResults, card.identifier);
        replaceSkeleton(card.identifier, finalCardHTML);
      } catch (error) {
        console.error(`Error processing card ${card.identifier}:`, error);
        removeSkeleton(card.identifier); // Silently remove skeleton on error
      }
    });
    
  } catch (error) {
    console.error("Error loading cards:", error);
    cardsContainer.innerHTML = "<p>Failed to load cards.</p>";
  }
};


// Function to check and fech an existing Minter Card if attempting to publish twice ----------------------------------------
const fetchExistingEncryptedCard = async () => {
  try {
    // Step 1: Perform the search
    const response = await qortalRequest({
      action: "SEARCH_QDN_RESOURCES",
      service: "BLOG_POST",
      identifier: cardIdentifierPrefix,
      name: userState.accountName,
      mode: "ALL",
      exactMatchNames: true // Search for the exact userName only when finding existing cards
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
        const isValid = await validateEncryptedCardStructure(card);
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
        name: userState.accountName, // User's account name
        service: "BLOG_POST",
        identifier: mostRecentCard.identifier
      });

      existingCardIdentifier = mostRecentCard.identifier;
      existingCardData = cardDataResponse;

      console.log("Full card data fetched successfully:", cardDataResponse);

      return cardDataResponse;
    }

    console.log("No valid cards found.");
    return null;
  } catch (error) {
    console.error("Error fetching existing card:", error);
    return null;
  }
};

// Validate that a card is indeed a card and not a comment. -------------------------------------
const validateEncryptedCardStructure = async (card) => {
  return (
    typeof card === "object" &&
    card.name &&
    card.service === "BLOG_POST" &&
    card.identifier && !card.identifier.includes("comment") &&
    card.created
  );
}

// Load existing card data passed, into the form for editing -------------------------------------
const loadEncryptedCardIntoForm = async (cardData) => {
  console.log("Loading existing card data:", cardData);
  document.getElementById("card-header").value = cardData.header;
  document.getElementById("card-content").value = cardData.content;

  const linksContainer = document.getElementById("links-container");
  linksContainer.innerHTML = ""; // Clear previous links
  cardData.links.forEach(link => {
    const linkInput = document.createElement("input");
    linkInput.type = "text";
    linkInput.className = "card-link";
    linkInput.value = link;
    linksContainer.appendChild(linkInput);
  });
}

// Main function to publish a new Minter Card -----------------------------------------------
const publishEncryptedCard = async () => {
  const header = document.getElementById("card-header").value.trim();
  const content = document.getElementById("card-content").value.trim();
  const links = Array.from(document.querySelectorAll(".card-link"))
    .map(input => input.value.trim())
    .filter(link => link.startsWith("qortal://"));

  if (!header || !content) {
    alert("Header and content are required!");
    return;
  }

  const cardIdentifier = isExistingCard ? existingCardIdentifier : `${cardIdentifierPrefix}-${await uid()}`;
  const pollName = `${cardIdentifier}-poll`;
  const pollDescription = `Mintership Board Poll for ${userState.accountName}`;

  const cardData = {
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
    
    await qortalRequest({
      action: "PUBLISH_QDN_RESOURCE",
      name: userState.accountName,
      service: "BLOG_POST",
      identifier: cardIdentifier,
      data64: base64CardData,
    });
    if (!isExistingCard){
      await qortalRequest({
        action: "CREATE_POLL",
        pollName,
        pollDescription,
        pollOptions: ['Yes, No'],
        pollOwnerAddress: userState.accountAddress,
      });

      alert("Card and poll published successfully!");
    }
    if (isExistingCard){
      alert("Card Updated Successfully! (No poll updates are possible at this time...)")
    }
    document.getElementById("publish-card-form").reset();
    document.getElementById("publish-card-view").style.display = "none";
    document.getElementById("cards-container").style.display = "flex";
    await loadCards();
  } catch (error) {
    console.error("Error publishing card or poll:", error);
    alert("Failed to publish card and poll.");
  }
}

// Post a comment on a card. ---------------------------------
const postEncryptedComment = async (cardIdentifier) => {
  const commentInput = document.getElementById(`new-comment-${cardIdentifier}`);
  const commentText = commentInput.value.trim();
  if (!commentText) {
    alert('Comment cannot be empty!');
    return;
  }

  const commentData = {
    content: commentText,
    creator: userState.accountName,
    timestamp: Date.now(),
  };

  const commentIdentifier = `comment-${cardIdentifier}-${await uid()}`;

  try {
    const base64CommentData = await objectToBase64(commentData);
      if (!base64CommentData) {
        console.log(`initial base64 object creation with objectToBase64 failed, using btoa...`);
        base64CommentData = btoa(JSON.stringify(commentData));
      }
   
    await qortalRequest({
      action: 'PUBLISH_QDN_RESOURCE',
      name: userState.accountName,
      service: 'BLOG_POST',
      identifier: commentIdentifier,
      data64: base64CommentData,
    });

    alert('Comment posted successfully!');
    commentInput.value = ''; // Clear input
    // await displayComments(cardIdentifier); // Refresh comments - We don't need to do this as comments will be displayed only after confirmation.
  } catch (error) {
    console.error('Error posting comment:', error);
    alert('Failed to post comment.');
  }
};

//Fetch the comments for a card with passed card identifier ----------------------------
const fetchCommentsForEncryptedCard = async (cardIdentifier) => {
  try {
    const response = await qortalRequest({
      action: 'SEARCH_QDN_RESOURCES',
      service: 'BLOG_POST',
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
    const comments = await fetchCommentsForCard(cardIdentifier);
    const commentsContainer = document.getElementById(`comments-container-${cardIdentifier}`);

    // Fetch and display each comment
    for (const comment of comments) {
      const commentDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: comment.name,
        service: "BLOG_POST",
        identifier: comment.identifier,
      });
      const timestamp = await timestampToHumanReadableDate(commentDataResponse.timestamp);
      //TODO - add fetching of poll results and checking to see if the commenter has voted and display it as 'supports minter' section.
      const commentHTML = `
        <div class="comment" style="border: 1px solid gray; margin: 1vh 0; padding: 1vh; background: #1c1c1c;">
          <p><strong><u>${commentDataResponse.creator}</strong>:</p></u>
          <p>${commentDataResponse.content}</p>
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



// Toggle comments from being shown or not, with passed cardIdentifier for comments being toggled --------------------
const toggleComments = async (cardIdentifier) => {
  const commentsSection = document.getElementById(`comments-section-${cardIdentifier}`);
  if (commentsSection.style.display === 'none' || !commentsSection.style.display) {
    await displayComments(cardIdentifier);
    commentsSection.style.display = 'block';
  } else {
    commentsSection.style.display = 'none';
  }
};

const createModal = async () => {
  const modalHTML = `
    <div id="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 1000;">
      <div style="position: relative; margin: 10% auto; width: 95%; height: 80%; background: white; border-radius: 10px; overflow: hidden;">
        <iframe id="modalContent" src="" style="width: 100%; height: 100%; border: none;"></iframe>
        <button onclick="closeModal()" style="position: absolute; top: 10px; right: 10px; background: red; color: white; border: none; padding: 5px 10px; border-radius: 5px;">Close</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Function to open the modal
const openModal = async (link) => {
  const processedLink = await processLink(link) // Process the link to replace `qortal://` for rendering in modal
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  modalContent.src = processedLink; // Set the iframe source to the link
  modal.style.display = 'block'; // Show the modal
}

// Function to close the modal
const closeModal = async () => {
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  modal.style.display = 'none'; // Hide the modal
  modalContent.src = ''; // Clear the iframe source
}

const processLink = async (link) => {
  if (link.startsWith('qortal://')) {
    const match = link.match(/^qortal:\/\/([^/]+)(\/.*)?$/);
    if (match) {
      const firstParam = match[1].toUpperCase(); // Convert to uppercase
      const remainingPath = match[2] || ""; // Rest of the URL
      // Perform any asynchronous operation if necessary
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulating async operation
      return `/render/${firstParam}${remainingPath}`;
    }
  }
  return link; // Return unchanged if not a Qortal link
}


// Create the overall Minter Card HTML -----------------------------------------------
const createEncryptedCardHTML = async (cardData, pollResults, cardIdentifier) => {
  const { header, content, links, creator, timestamp, poll } = cardData;
  const formattedDate = new Date(timestamp).toLocaleString();
  const avatarUrl = `/arbitrary/THUMBNAIL/${creator}/qortal_avatar`;
  const linksHTML = links.map((link, index) => `
    <button onclick="openModal('${link}')">
      ${`Link ${index + 1} - ${link}`}
    </button>
  `).join("");

  const minterGroupMembers = await fetchMinterGroupMembers();
  const minterAdmins = await fetchMinterGroupAdmins();
  const { adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, totalYes = 0, totalNo = 0, totalYesWeight = 0, totalNoWeight = 0 } = await calculatePollResults(pollResults, minterGroupMembers, minterAdmins)
  await createModal()
  return `
  <div class="minter-card">
    <div class="minter-card-header">
      <img src="${avatarUrl}" alt="User Avatar" class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; align-self: center;">
      <h3>${creator}</h3>
      <p>${header}</p>
    </div>
    <div class="support-header"><h5>Minter Post:</h5></div>
    <div class="info">
      ${content}
    </div>
    <div class="support-header"><h5>Minter Links:</h5></div>
    <div class="info-links">
      ${linksHTML}
    </div>
    <div class="results-header support-header"><h5>Current Results:</h5></div>
    <div class="minter-card-results">
      <div class="admin-results">
        <span class="admin-yes">Admin Yes: ${adminYes}</span>
        <span class="admin-no">Admin No: ${adminNo}</span>
      </div>
      <div class="minter-results">
        <span class="minter-yes">Minter Yes: ${minterYes}</span>
        <span class="minter-no">Minter No: ${minterNo}</span>
      </div>
      <div class="total-results">
        <span class="total-yes">Total Yes: ${totalYes}</span>
        <span class="total-no">Total No: ${totalNo}</span>
      </div>
    </div>
    <div class="support-header"><h5>Support Minter?</h5></div> 
    <div class="actions">
      <div class="actions-buttons">
        <button class="yes" onclick="voteYesOnPoll('${poll}')">YES</button>
        <button class="comment" onclick="toggleComments('${cardIdentifier}')">COMMENTS</button>
        <button class="no" onclick="voteNoOnPoll('${poll}')">NO</button>
      </div>
    </div>
    <div id="comments-section-${cardIdentifier}" class="comments-section" style="display: none; margin-top: 20px;">
      <div id="comments-container-${cardIdentifier}" class="comments-container"></div>
      <textarea id="new-comment-${cardIdentifier}" placeholder="Write a comment..." style="width: 100%; margin-top: 10px;"></textarea>
      <button onclick="postComment('${cardIdentifier}')">Post Comment</button>
    </div>
    <p style="font-size: 12px; color: gray;">Published by: ${creator} on ${formattedDate}</p>
  </div>
  `;
}

