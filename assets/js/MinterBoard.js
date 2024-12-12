const cardIdentifierPrefix = "test-board-card"
// const cardIdentifierPrefix = "testMB-board-card";
let isExistingCard = false;
let existingCardData = {};
let existingCardIdentifier ={};

document.addEventListener("DOMContentLoaded", async () => {
  const minterBoardLinks = document.querySelectorAll('a[href="MINTER-BOARD"], a[href="MINTERS"]');

  minterBoardLinks.forEach(link => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!userState.isLoggedIn) {
        await login();
      }
      await loadMinterBoardPage();
    });
  });
});

async function loadMinterBoardPage() {
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
      <p> The Minter Board is a place to publish information about yourself in order to obtain support from existing Minters and Minter Admins on the Qortal network. You may publish a header, content, and links to other QDN-published content in order to support you in your mission. Minter Admins and Existing Minters will then support you (or not) by way of a vote on your card. Card details you publish, along with existing poll results, and comments from others, will be displayed here. Good Luck on your Qortal journey to becoming a minter!</p>
      <button id="publish-card-button" class="publish-card-button" style="margin: 20px; padding: 10px;">Publish Minter Card</button>
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
      await fetchExistingCard();
      const cardIdentifier = existingCardIdentifier
      if (cardIdentifier) {
        // Update existing card
        const updateCard = confirm("A card already exists. Do you want to update it?");
        isExistingCard = true;

        if (updateCard) {
          // Load existing card into the form for editing
          loadCardIntoForm(existingCardData);
          alert("Edit your existing card and publish.");
        } else {
          // Allow creating a new card for testing purposes
          alert("You can now create a new card for testing.");
          isExistingCard = false;
          existingCardData = {}; // Reset to allow new card creation
          document.getElementById("publish-card-form").reset();
        }
      } else {
        alert("No existing card found. Create a new card.");
        isExistingCard = false;
      }

      // Show the form for publishing a card
      const publishCardView = document.getElementById("publish-card-view");
      publishCardView.style.display = "flex";
      document.getElementById("cards-container").style.display = "none";
    } catch (error) {
      console.error("Error checking for existing card:", error);
      alert("Failed to check for existing card. Please try again.");
    }
  });

  document.getElementById("cancel-publish-button").addEventListener("click", () => {
    const cardsContainer = document.getElementById("cards-container");
    cardsContainer.style.display = "flex"; // Restore visibility
    const publishCardView = document.getElementById("publish-card-view");
    publishCardView.style.display = "none"; // Hide the publish form
  });

  document.getElementById("add-link-button").addEventListener("click", () => {
    const linksContainer = document.getElementById("links-container");
    const newLinkInput = document.createElement("input");
    newLinkInput.type = "text";
    newLinkInput.className = "card-link";
    newLinkInput.placeholder = "Enter QDN link";
    linksContainer.appendChild(newLinkInput);
  });

  document.getElementById("publish-card-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await publishCard();
  });

  await loadCards();
}

async function fetchExistingCard() {
  try {
    // Step 1: Perform the search
    const response = await qortalRequest({
      action: "SEARCH_QDN_RESOURCES",
      service: "BLOG_POST",
      identifier: cardIdentifierPrefix,
      name: userState.accountName,
      exactMatchNames: true //we want to search for the EXACT userName only when finding existing cards.
    });

    console.log(`SEARCH_QDN_RESOURCES response: ${JSON.stringify(response, null, 2)}`);

    // Step 2: Check if the response is an array and not empty
    if (!response || !Array.isArray(response) || response.length === 0) {
      console.log("No cards found for the current user.");
      return null;
    }

    const validCards = response.filter(card => validateCardStructure(card));

    if (validCards.length > 0) {
      // Sort by most recent timestamp
      const mostRecentCard = validCards.sort((a, b) => b.created - a.created)[0];

    const cardDataResponse = await qortalRequest({
      action: "FETCH_QDN_RESOURCE",
      name: userState.accountName, // User's account name
      service: "BLOG_POST",
      identifier: mostRecentCard.identifier,
    });
    
    existingCardIdentifier = mostRecentCard.identifier
    existingCardData = cardDataResponse

    console.log("Full card data fetched successfully:", cardDataResponse);

    return cardDataResponse; // Return full card data
  }

  console.log("No valid cards found.");
    return null;

  } catch (error) {
    console.error("Error fetching existing card:", error);
    return null;
  }
}

const validateCardStructure = (card) => {
  return (
    typeof card === "object" &&
    card.name &&
    card.service === "BLOG_POST" &&
    card.identifier && !card.identifier.includes("comment") &&
    card.created
  );
}

function loadCardIntoForm(cardData) {
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

async function publishCard() {
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
  // new Date().toISOString()
  try {

    let base64CardData = await objectToBase64(cardData);
      if (!base64CardData) {
        console.log(`initial base64 object creation with objectToBase64 failed, using btoa...`);
        base64CardData = btoa(JSON.stringify(cardData));
      }
    // const base64CardData = btoa(JSON.stringify(cardData));
    
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

async function loadCards() {
  const cardsContainer = document.getElementById("cards-container");
  cardsContainer.innerHTML = "<p>Loading cards...</p>";

  try {
    const response = await qortalRequest({
      action: "SEARCH_QDN_RESOURCES",
      service: "BLOG_POST",
      query: cardIdentifierPrefix,
    });

    if (!response || response.length === 0) {
      cardsContainer.innerHTML = "<p>No cards found.</p>";
      return;
    }

    cardsContainer.innerHTML = ""
    const pollResultsCache = {};

    for (const card of response) {
      const validCard = await validateCardStructure(card)
      const cardDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: validCard.name,
        service: "BLOG_POST",
        identifier: validCard.identifier,
      });

      const cardData = cardDataResponse;
      
      if (!cardData || !cardData.poll) {
        console.warn(`Skipping card with missing poll data: ${JSON.stringify(cardData)}`);
        continue; // Skip to the next card
      }

      // Cache poll results
      if (!pollResultsCache[cardData.poll]) {
        try {
          pollResultsCache[cardData.poll] = await fetchPollResults(cardData.poll);
        } catch (error) {
          console.warn(`Failed to fetch poll results for poll: ${cardData.poll}`, error);
          pollResultsCache[cardData.poll] = null; // Store as null to avoid repeated attempts
        }
      }

      const pollResults = pollResultsCache[cardData.poll];
      const cardHTML = await createCardHTML(cardData, pollResults, card.identifier);
      cardsContainer.insertAdjacentHTML("beforeend", cardHTML);
    }
  } catch (error) {
    console.error("Error loading cards:", error);
    cardsContainer.innerHTML = "<p>Failed to load cards.</p>";
  }
}

const calculatePollResults = (pollData, minterGroupMembers) => {
  const memberAddresses = minterGroupMembers.map(member => member.member);
  let adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0;

  pollData.votes.forEach(vote => {
    const voterAddress = getAddressFromPublicKey(vote.voterPublicKey);
    const isAdmin = minterGroupMembers.some(member => member.member === voterAddress && member.isAdmin);

    if (vote.optionIndex === 1) {
      isAdmin ? adminYes++ : memberAddresses.includes(voterAddress) ? minterYes++ : null;
    } else if (vote.optionIndex === 0) {
      isAdmin ? adminNo++ : memberAddresses.includes(voterAddress) ? minterNo++ : null;
    }
  });

  const totalYes = adminYes + minterYes;
  const totalNo = adminNo + minterNo;

  return { adminYes, adminNo, minterYes, minterNo, totalYes, totalNo };
};

const postComment = async (cardIdentifier) => {
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
    // const base64CommentData = btoa(JSON.stringify(commentData));
    await qortalRequest({
      action: 'PUBLISH_QDN_RESOURCE',
      name: userState.accountName,
      service: 'BLOG_POST',
      identifier: commentIdentifier,
      data64: base64CommentData,
    });

    alert('Comment posted successfully!');
    commentInput.value = ''; // Clear input
    await displayComments(cardIdentifier); // Refresh comments
  } catch (error) {
    console.error('Error posting comment:', error);
    alert('Failed to post comment.');
  }
};

const fetchCommentsForCard = async (cardIdentifier) => {
  try {
    const response = await qortalRequest({
      action: 'SEARCH_QDN_RESOURCES',
      service: 'BLOG_POST',
      query: `comment-${cardIdentifier}`,
    });
    return response;
  } catch (error) {
    console.error(`Error fetching comments for ${cardIdentifier}:`, error);
    return [];
  }
};

const displayComments = async (cardIdentifier) => {
  try {
    const comments = await fetchCommentsForCard(cardIdentifier);
    const commentsContainer = document.getElementById(`comments-container-${cardIdentifier}`);
    
    // Clear previous comments
    commentsContainer.innerHTML = '';

    // Fetch and display each comment
    for (const comment of comments) {
      const commentDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: comment.name,
        service: "BLOG_POST",
        identifier: comment.identifier,
      });
      const timestamp = await timestampToHumanReadableDate(commentDataResponse.timestamp);
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


const toggleComments = async (cardIdentifier) => {
  const commentsSection = document.getElementById(`comments-section-${cardIdentifier}`);
  if (commentsSection.style.display === 'none' || !commentsSection.style.display) {
    await displayComments(cardIdentifier);
    commentsSection.style.display = 'block';
  } else {
    commentsSection.style.display = 'none';
  }
};

async function createCardHTML(cardData, pollResults, cardIdentifier) {
  const { header, content, links, creator, timestamp, poll } = cardData;
  const formattedDate = new Date(timestamp).toLocaleString();
  const avatarUrl = `/arbitrary/THUMBNAIL/${creator}/qortal_avatar`;
  const linksHTML = links.map((link, index) => `
    <button onclick="window.open('${link}', '_blank')">
      ${`Link ${index + 1} - ${link}`}
    </button>
  `).join("");

  const minterGroupMembers = await fetchMinterGroupMembers();
  const { adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, totalYes = 0, totalNo = 0 } =
    calculatePollResults(pollResults, minterGroupMembers) || {};


  return `
  <div class="minter-card">
    <div class="minter-card-header">
      <img src="${avatarUrl}" alt="User Avatar" class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%;">
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
        <button class="yes" onclick="voteOnPoll('${poll}', 'Yes')">YES</button>
        <button class="comment" onclick="toggleComments('${cardIdentifier}')">COMMENTS</button>
        <button class="no" onclick="voteOnPoll('${poll}', 'No')">NO</button>
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

