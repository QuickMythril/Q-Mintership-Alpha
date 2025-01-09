// NOTE - Change isTestMode to false prior to actual release ---- !important - You may also change identifier if you want to not show older cards.
const isEncryptedTestMode = false
const encryptedCardIdentifierPrefix = "card-MAC"
let isUpdateCard = false
let existingDecryptedCardData = {}
let existingEncryptedCardIdentifier = {}
let cardMinterName = {}
let existingCardMinterNames = []
let isTopic = false
let attemptLoadAdminDataCount = 0
let adminMemberCount = 0
let adminPublicKeys = []
let kickTransactions = []
let banTransactions = []

console.log("Attempting to load AdminBoard.js")

const loadAdminBoardPage = async () => {
  // Clear existing content on the page
  const bodyChildren = document.body.children;
  for (let i = bodyChildren.length - 1; i >= 0; i--) {
      const child = bodyChildren[i];
      if (!child.classList.contains("menu")) {
      child.remove()
      }
  }

  // Add the "Minter Board" content
  const mainContent = document.createElement("div")
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
        <h3>Create or Update an Admin Card</h3>
        <div class="publish-card-checkbox" style="margin-top: 1em;">
          <input type="checkbox" id="topic-checkbox" name="topicMode" />
          <label for="topic-checkbox">Is this a Topic instead of a Minter?</label>
        </div>
        <label for="minter-name-input">Input TOPIC or NAME:</label>
        <input type="text" id="minter-name-input" maxlength="100" placeholder="input NAME or TOPIC" required>
        <label for="card-header">Header:</label>
        <input type="text" id="card-header" maxlength="100" placeholder="Explain main point/issue" required>
        <label for="card-content">Content:</label>
        <textarea id="card-content" placeholder="Enter any information you like... CHECK THE TOPIC CHECKBOX if you do not want to publish a NAME card. NAME cards are verified and can only be one per name. Links are displayed in in-app pop-up." required></textarea>
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
  `
  document.body.appendChild(mainContent)
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
      await fetchAllEncryptedCards(true)
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
    event.preventDefault()
    const isTopicChecked = document.getElementById("topic-checkbox").checked
    // Pass that boolean to publishEncryptedCard
    await publishEncryptedCard(isTopicChecked)
  })
  createScrollToTopButton()
  // await fetchAndValidateAllAdminCards()
  await updateOrSaveAdminGroupsDataLocally()
  await fetchAllKicKBanTxData()
  await fetchAllEncryptedCards()  
}

const fetchAllKicKBanTxData = async () => {
  const kickTxType = "GROUP_KICK"
  const banTxType = "GROUP_BAN"
  const banArray = [banTxType]
  const kickArray = [kickTxType]

  banTransactions = await searchTransactions({
    txTypes: banArray,
    address: '',                // or whatever address
    confirmationStatus: 'CONFIRMED',
    limit: 0,
    reverse: true,
    offset: 0,
    startBlock: 1990000,
    blockLimit: 0,
    txGroupId: 0
  });
  console.warn(`banTxData`, banTransactions)

  kickTransactions = await searchTransactions({
    txTypes: kickArray,
    address: '',
    confirmationStatus: 'CONFIRMED',
    limit: 0,
    reverse: true,
    offset: 0,
    startBlock: 1990000,
    blockLimit: 0,
    txGroupId: 0
  });
  console.warn(`kickTxData`, kickTransactions)
}


// Example: fetch and save admin public keys and count
const updateOrSaveAdminGroupsDataLocally = async () => {
  try {
    // Fetch the array of admin public keys
    const verifiedAdminPublicKeys = await fetchAdminGroupsMembersPublicKeys()

    // Build an object containing the count and the array
    const adminData = {
      keysCount: verifiedAdminPublicKeys.length,
      publicKeys: verifiedAdminPublicKeys
    };

    adminPublicKeys = verifiedAdminPublicKeys

    // Stringify and save to localStorage
    localStorage.setItem('savedAdminData', JSON.stringify(adminData))

    console.log('Admin public keys saved locally:', adminData)
  } catch (error) {
    console.error('Error fetching/storing admin public keys:', error)
    attemptLoadAdminDataCount++
  }
}

const loadOrFetchAdminGroupsData = async () => {
  try {
    // Pull the JSON from localStorage
    const storedData = localStorage.getItem('savedAdminData')
    if (!storedData && attemptLoadAdminDataCount <= 3) {
      console.log('No saved admin public keys found in local storage. Fetching...')
      await updateOrSaveAdminGroupsDataLocally()
      attemptLoadAdminDataCount++
      return null;
    }
    // Parse the JSON, then store the global variables.
    const parsedData = JSON.parse(storedData)
    
    adminMemberCount = parsedData.keysCount
    adminPublicKeys = parsedData.publicKeys

    console.log(typeof adminPublicKeys); // Should be "object"
    console.log(Array.isArray(adminPublicKeys))

    console.log(`Loaded admins 'keysCount'=${adminMemberCount}, publicKeys=`, adminPublicKeys)
    attemptLoadAdminDataCount = 0

    return parsedData; // and return { adminMemberCount, adminKeys } to the caller
  } catch (error) {
    console.error('Error loading/parsing saved admin public keys:', error)
    return null
  }
}

const extractEncryptedCardsMinterName = (cardIdentifier) => {
  const parts = cardIdentifier.split('-');
  // Ensure the format has at least 3 parts
  if (parts.length < 3) {
    throw new Error('Invalid identifier format');
  }
  
  if (parts.slice(2, -1).join('-') === 'TOPIC') {
    console.log(`TOPIC found in identifier: ${cardIdentifier} - not including in duplicatesList`)
    return
  }
  // Extract minterName (everything from the second part to the second-to-last part)
  const minterName = parts.slice(2, -1).join('-')
  // Return the extracted minterName
  return minterName
}

const fetchAllEncryptedCards = async (isRefresh = false) => {
  const encryptedCardsContainer = document.getElementById("encrypted-cards-container")
  encryptedCardsContainer.innerHTML = "<p>Loading cards...</p>"

  try {
    const response = await searchSimple('MAIL_PRIVATE', `${encryptedCardIdentifierPrefix}`, '', 0)

    if (!response || !Array.isArray(response) || response.length === 0) {
      encryptedCardsContainer.innerHTML = "<p>No cards found.</p>"
      return
    }

    // Validate and decrypt cards asynchronously
    const validatedCards = await Promise.all(
      response.map(async (card) => {
        try {
          // Validate the card identifier
          const isValid = await validateEncryptedCardIdentifier(card)
          if (!isValid) return null

          // Fetch and decrypt the card data
          const cardDataResponse = await qortalRequest({
            action: "FETCH_QDN_RESOURCE",
            name: card.name,
            service: "MAIL_PRIVATE",
            identifier: card.identifier,
            encoding: "base64",
          })

          if (!cardDataResponse) return null

          const decryptedCardData = await decryptAndParseObject(cardDataResponse)

          // Skip cards without polls
          if (!decryptedCardData.poll) return null

          return { card, decryptedCardData }
        } catch (error) {
          console.warn(`Error processing card ${card.identifier}:`, error)
          return null
        }
      })
    )

    // Filter out invalid or skipped cards
    const validCardsWithData = validatedCards.filter((entry) => entry !== null)

    if (validCardsWithData.length === 0) {
      encryptedCardsContainer.innerHTML = "<p>No valid cards found.</p>"
      return;
    }

    // Combine `processCards` logic: Deduplicate cards by identifier and keep latest timestamp
    const latestCardsMap = new Map()

    validCardsWithData.forEach(({ card, decryptedCardData }) => {
      const timestamp = card.updated || card.created || 0
      const existingCard = latestCardsMap.get(card.identifier)

      if (!existingCard || timestamp > (existingCard.card.updated || existingCard.card.created || 0)) {
        latestCardsMap.set(card.identifier, { card, decryptedCardData })
      }
    })

    const uniqueValidCards = Array.from(latestCardsMap.values())

    // Map to track the most recent card per minterName
    const mostRecentCardsMap = new Map()

    uniqueValidCards.forEach(({ card, decryptedCardData }) => {
      const obtainedMinterName = decryptedCardData.minterName
      // Only check for cards that are NOT topic-based cards
      if ((!decryptedCardData.isTopic) || decryptedCardData.isTopic === 'false') {
        const cardTimestamp = card.updated || card.created || 0

        if (obtainedMinterName) {
          const existingEntry = mostRecentCardsMap.get(obtainedMinterName)

          // Replace only if the current card is more recent
          if (!existingEntry || cardTimestamp > (existingEntry.card.updated || existingEntry.card.created || 0)) {
            mostRecentCardsMap.set(obtainedMinterName, { card, decryptedCardData })
          }
        }
      } else {
        console.log(`topic card detected, skipping most recent by name mapping...`)
        // We still need to add the topic-based cards to the map, as it will be utilized in the next step
        mostRecentCardsMap.set(obtainedMinterName, {card, decryptedCardData})
      }
    })

    // Convert the map into an array of final cards
    const finalCards = Array.from(mostRecentCardsMap.values());

    // Sort cards by timestamp (most recent first)
    finalCards.sort((a, b) => {
      const timestampA = a.card.updated || a.card.created || 0
      const timestampB = b.card.updated || b.card.created || 0
      return timestampB - timestampA;
    })

    encryptedCardsContainer.innerHTML = ""

    // Display skeleton cards immediately
    finalCards.forEach(({ card }) => {
      const skeletonHTML = createSkeletonCardHTML(card.identifier)
      encryptedCardsContainer.insertAdjacentHTML("beforeend", skeletonHTML)
    })

    // Fetch poll results and update each card
    await Promise.all(
      finalCards.map(async ({ card, decryptedCardData }) => {
        try {
          // Validate poll publisher keys
          const encryptedCardPollPublisherPublicKey = await getPollPublisherPublicKey(decryptedCardData.poll)
          const encryptedCardPublisherPublicKey = await getPublicKeyByName(card.name)

          if (encryptedCardPollPublisherPublicKey !== encryptedCardPublisherPublicKey) {
            console.warn(`QuickMythril cardPollHijack attack detected! Skipping card: ${card.identifier}`)
            removeSkeleton(card.identifier)
            return
          }

          // Fetch poll results
          const pollResults = await fetchPollResults(decryptedCardData.poll)

          if (pollResults?.error) {
            console.warn(`Skipping card with failed poll results: ${card.identifier}`)
            removeSkeleton(card.identifier);
            return;
          }

          const encryptedCommentCount = await getEncryptedCommentCount(card.identifier)

          // Generate final card HTML
          const finalCardHTML = await createEncryptedCardHTML(
            decryptedCardData,
            pollResults,
            card.identifier,
            encryptedCommentCount
          )
          replaceSkeleton(card.identifier, finalCardHTML)
        } catch (error) {
          console.error(`Error finalizing card ${card.identifier}:`, error)
          removeSkeleton(card.identifier)
        }
      })
    )
  } catch (error) {
    console.error("Error loading cards:", error)
    encryptedCardsContainer.innerHTML = "<p>Failed to load cards.</p>"
  }
}

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
  `
}


// Function to check and fech an existing Minter Card if attempting to publish twice ----------------------------------------
const fetchExistingEncryptedCard = async (minterName, existingIdentifier) => {
  
  try{
    const cardDataResponse = await qortalRequest({
      action: "FETCH_QDN_RESOURCE",
      name: minterName, 
      service: "MAIL_PRIVATE",
      identifier: existingIdentifier,
      encoding: "base64"
    })

    const decryptedCardData = await decryptAndParseObject(cardDataResponse)
    console.log("Full card data fetched successfully:", decryptedCardData)

    return decryptedCardData
    
  } catch (error) {
    console.error("Error fetching existing card:", error)
    return null
  }
}

// Validate that a card is indeed a card and not a comment. -------------------------------------
const validateEncryptedCardIdentifier = async (card) => {
  return (
    typeof card === "object" &&
    card.name &&
    card.service === "MAIL_PRIVATE" &&
    card.identifier && !card.identifier.includes("comment") && !card.identifier.includes("card-MAC-NC-function now() { [native code] }-Y6CmuY") && // Added check for failed name card publish due to identifier issue.
    card.created
  )
}

// Load existing card data passed, into the form for editing -------------------------------------
const loadEncryptedCardIntoForm = async (decryptedCardData) => {
  if (decryptedCardData) {
    console.log("Loading existing card data:", decryptedCardData);
    document.getElementById("minter-name-input").value = decryptedCardData.minterName
    document.getElementById("card-header").value = decryptedCardData.header
    document.getElementById("card-content").value = decryptedCardData.content

    const linksContainer = document.getElementById("links-container")
    linksContainer.innerHTML = ""; // Clear previous links
    decryptedCardData.links.forEach(link => {
      const linkInput = document.createElement("input")
      linkInput.type = "text"
      linkInput.className = "card-link"
      linkInput.value = link
      linksContainer.appendChild(linkInput)
    })
  }
}

const validateMinterName = async(minterName) => {
  try {
    const nameInfo =  await getNameInfo(minterName)
    const name = nameInfo.name
    return name
  } catch (error){
      console.error(`extracting name from name info: ${minterName} failed.`, error)
      return null
  }
}

const publishEncryptedCard = async (isTopicModePassed = false) => {
  // If the user wants it to be a topic, we set global isTopic = true, else false
  isTopic = isTopicModePassed || isTopic

  const minterNameInput = document.getElementById("minter-name-input").value.trim()
  const header = document.getElementById("card-header").value.trim()
  const content = document.getElementById("card-content").value.trim()
  const links = Array.from(document.querySelectorAll(".card-link"))
    .map(input => input.value.trim())
    .filter(link => link.startsWith("qortal://"))

  // Basic validation
  if (!header || !content) {
    alert("Header and Content are required!")
    return
  }

  let publishedMinterName = minterNameInput

  // If not topic mode, validate the user actually entered a valid Minter name
  if (!isTopic) {
    publishedMinterName = await validateMinterName(minterNameInput)
    if (!publishedMinterName) {
      alert(`"${minterNameInput}" doesn't seem to be a valid name. Please check or use topic mode.`)
      return
    }
    // Also check for existing card if not topic
    if (!isUpdateCard && existingCardMinterNames.some(item => item.minterName === publishedMinterName)) {
      const duplicateCardData = existingCardMinterNames.find(item => item.minterName === publishedMinterName)
      const updateCard = confirm(
        `Minter Name: ${publishedMinterName} already has a card. Duplicate name-based cards are not allowed. You can OVERWRITE it or Cancel publishing. UPDATE CARD?`
      )
      if (updateCard) {
        existingEncryptedCardIdentifier = duplicateCardData.identifier
        isUpdateCard = true
      } else {
        return
      }
    }
  }

  // Determine final card identifier
  const currentTimestamp = Date.now()
  const newCardIdentifier = isTopic
    ? `${encryptedCardIdentifierPrefix}-TOPIC-${await uid()}`
    : `${encryptedCardIdentifierPrefix}-NC-${currentTimestamp}-${await uid()}`

  const cardIdentifier = isUpdateCard ? existingEncryptedCardIdentifier : newCardIdentifier

  // Build cardData
  const pollName = `${cardIdentifier}-poll`
  const cardData = {
    minterName: publishedMinterName,
    header,
    content,
    links,
    creator: userState.accountName,
    timestamp: Date.now(),
    poll: pollName,
    topicMode: isTopic
  }

  try {
    // Convert to base64 or fallback
    let base64CardData = await objectToBase64(cardData)
    if (!base64CardData) {
      base64CardData = btoa(JSON.stringify(cardData))
    }

    let verifiedAdminPublicKeys = adminPublicKeys

    if ((!verifiedAdminPublicKeys) || verifiedAdminPublicKeys.length <= 5 || !Array.isArray(verifiedAdminPublicKeys)) {
      console.log(`adminPublicKeys variable failed check, attempting to load from localStorage`,adminPublicKeys)
      const savedAdminData = localStorage.getItem('savedAdminData')
      const parsedAdminData = JSON.parse(savedAdminData)
      const loadedAdminKeys = parsedAdminData.publicKeys

      if ((!loadedAdminKeys) || (!Array.isArray(loadedAdminKeys)) || (loadedAdminKeys.length === 0)){
        console.log('loaded admin keys from localStorage failed, falling back to API call...')
        verifiedAdminPublicKeys = await fetchAdminGroupsMembersPublicKeys()
      }

      verifiedAdminPublicKeys = loadedAdminKeys
    }

    await qortalRequest({
      action: "PUBLISH_QDN_RESOURCE",
      name: userState.accountName,
      service: "MAIL_PRIVATE",
      identifier: cardIdentifier,
      data64: base64CardData,
      encrypt: true,
      publicKeys: verifiedAdminPublicKeys
    })

    // Possibly create a poll if it’s a brand new card
    if (!isUpdateCard) {
      await qortalRequest({
        action: "CREATE_POLL",
        pollName,
        pollDescription: `Admin Board Poll Published By ${userState.accountName}`,
        pollOptions: ["Yes, No"],
        pollOwnerAddress: userState.accountAddress
      })
      alert("Card and poll published successfully!")

    } else {
      alert("Card updated successfully! (No poll updates possible currently...)");
    }

    document.getElementById("publish-card-form").reset()
    document.getElementById("publish-card-view").style.display = "none"
    document.getElementById("encrypted-cards-container").style.display = "flex"
    isTopic = false; // reset global
  } catch (error) {
    console.error("Error publishing card or poll:", error)
    alert("Failed to publish card and poll.")
  }
}


const getEncryptedCommentCount = async (cardIdentifier) => {
  try {
    const response = await searchSimple('MAIL_PRIVATE', `comment-${cardIdentifier}`, '', 0)
    
    return Array.isArray(response) ? response.length : 0
  } catch (error) {
    console.error(`Error fetching comment count for ${cardIdentifier}:`, error)
    return 0
  }
}

// Post a comment on a card. ---------------------------------
const postEncryptedComment = async (cardIdentifier) => {
  const commentInput = document.getElementById(`new-comment-${cardIdentifier}`)
  const commentText = commentInput.value.trim()

  if (!commentText) {
    alert('Comment cannot be empty!')
    return
  }
  const postTimestamp = Date.now()
  const commentData = {
    content: commentText,
    creator: userState.accountName,
    timestamp: postTimestamp,
  }
  const commentIdentifier = `comment-${cardIdentifier}-${await uid()}`

  if (!Array.isArray(adminPublicKeys) || (adminPublicKeys.length === 0) || (!adminPublicKeys)) {
    console.log('adminPpublicKeys variable failed checks, calling for admin public keys from API (comment)',adminPublicKeys)
    const verifiedAdminPublicKeys = await fetchAdminGroupsMembersPublicKeys()
    adminPublicKeys = verifiedAdminPublicKeys
  } 

  try {
    const base64CommentData = await objectToBase64(commentData)
    if (!base64CommentData) {
      console.log(`initial base64 object creation with objectToBase64 failed, using btoa...`)
      base64CommentData = btoa(JSON.stringify(commentData))
    }

    await qortalRequest({
      action: "PUBLISH_QDN_RESOURCE",
      name: userState.accountName,
      service: "MAIL_PRIVATE",
      identifier: commentIdentifier,
      data64: base64CommentData,
      encrypt: true,
      publicKeys: adminPublicKeys
    })
    alert('Comment posted successfully!')
    commentInput.value = ''
    
  } catch (error) {
      console.error('Error posting comment:', error)
      alert('Failed to post comment.')
  }
}

//Fetch the comments for a card with passed card identifier ----------------------------
const fetchEncryptedComments = async (cardIdentifier) => {
  try {
    const response = await searchSimple('MAIL_PRIVATE', `comment-${cardIdentifier}`, '', 0, 0, '', false)
    if (response) {
      return response
    }
  } catch (error) {
    console.error(`Error fetching comments for ${cardIdentifier}:`, error)
    return []
  }
}

const displayEncryptedComments = async (cardIdentifier) => {
  try {
    const comments = await fetchEncryptedComments(cardIdentifier)
    const commentsContainer = document.getElementById(`comments-container-${cardIdentifier}`)

    commentsContainer.innerHTML = ''

    const voterMap = globalVoterMap.get(cardIdentifier) || new Map()

    const commentHTMLArray = await Promise.all(
      comments.map(async (comment) => {
        try {
          const commentDataResponse = await qortalRequest({
            action: "FETCH_QDN_RESOURCE",
            name: comment.name,
            service: "MAIL_PRIVATE",
            identifier: comment.identifier,
            encoding: "base64",
          })

          const decryptedCommentData = await decryptAndParseObject(commentDataResponse)
          const timestampCheck = comment.updated || comment.created || 0
          const timestamp = await timestampToHumanReadableDate(timestampCheck)

          const commenter = decryptedCommentData.creator
          const voterInfo = voterMap.get(commenter)

          let commentColor = "transparent"
          let adminBadge = ""

          if (voterInfo) {
            if (voterInfo.voterType === "Admin") {
              // Admin-specific colors
              commentColor = voterInfo.vote === "yes" ? "rgba(25, 175, 25, 0.6)" : "rgba(194, 39, 62, 0.6)" // Light green for yes, light red for no
              const badgeColor = voterInfo.vote === "yes" ? "green" : "red"
              adminBadge = `<span style="color: ${badgeColor}; font-weight: bold; margin-left: 0.5em;">(Admin)</span>`
            } else {
              // Non-admin colors
              commentColor = voterInfo.vote === "yes" ? "rgba(0, 100, 0, 0.3)" : "rgba(100, 0, 0, 0.3)" // Darker green for yes, darker red for no
            }
          }

          return `
            <div class="comment" style="border: 1px solid gray; margin: 1vh 0; padding: 1vh; background: ${commentColor};">
              <p>
                <strong><u>${decryptedCommentData.creator}</u></strong>
                ${adminBadge}
              </p>
              <p>${decryptedCommentData.content}</p>
              <p><i>${timestamp}</i></p>
            </div>
          `
        } catch (err) {
          console.error(`Error processing comment ${comment.identifier}:`, err)
          return null // Skip this comment if it fails
        }
      })
    )

    // Add all comments to the container
    commentHTMLArray
      .filter((html) => html !== null) // Filter out failed comments
      .forEach((commentHTML) => {
        commentsContainer.insertAdjacentHTML('beforeend', commentHTML)
      })
  } catch (error) {
    console.error(`Error displaying comments (or no comments) for ${cardIdentifier}:`, error)
  }
}


const toggleEncryptedComments = async (cardIdentifier) => {
  const commentsSection = document.getElementById(`comments-section-${cardIdentifier}`)
  const commentButton = document.getElementById(`comment-button-${cardIdentifier}`)

  if (!commentsSection || !commentButton) return

  const count = commentButton.dataset.commentCount;
  const isHidden = (commentsSection.style.display === 'none' || !commentsSection.style.display)

  if (isHidden) {
    // Show comments
    commentButton.textContent = "LOADING..."
    await displayEncryptedComments(cardIdentifier)
    commentsSection.style.display = 'block'
    // Change the button text to 'HIDE COMMENTS'
    commentButton.textContent = 'HIDE COMMENTS'
  } else {
    // Hide comments
    commentsSection.style.display = 'none'
    commentButton.textContent = `COMMENTS (${count})`
  }
}

const createLinkDisplayModal = async () => {
  const modalHTML = `
    <div id="links-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 1000;">
      <div style="position: relative; margin: 10% auto; width: 95%; height: 80%; background: white; border-radius: 10px; overflow: hidden;">
        <iframe id="links-modalContent" src="" style="width: 100%; height: 100%; border: none;"></iframe>
        <button onclick="closeLinkDisplayModal()" style="position: absolute; top: 10px; right: 10px; background: red; color: white; border: none; padding: 5px 10px; border-radius: 5px;">Close</button>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHTML)
}

// Function to open the modal
const openLinkDisplayModal = async (link) => {
  const processedLink = await processQortalLinkForRendering(link) // Process the link to replace `qortal://` for rendering in modal
  const modal = document.getElementById('links-modal')
  const modalContent = document.getElementById('links-modalContent')
  modalContent.src = processedLink // Set the iframe source to the link
  modal.style.display = 'block' // Show the modal
}

// Function to close the modal
const closeLinkDisplayModal = async () => {
  const modal = document.getElementById('links-modal')
  const modalContent = document.getElementById('links-modalContent')
  modal.style.display = 'none' // Hide the modal
  modalContent.src = '' // Clear the iframe source
}

const processQortalLinkForRendering = async (link) => {
  if (link.startsWith('qortal://')) {
    const match = link.match(/^qortal:\/\/([^/]+)(\/.*)?$/)
    if (match) {
      const firstParam = match[1].toUpperCase()
      const remainingPath = match[2] || ""
      const themeColor = window._qdnTheme || 'default' // Fallback to 'default' if undefined
      // Simulating async operation if needed
      await new Promise(resolve => setTimeout(resolve, 10))
      
      return `/render/${firstParam}${remainingPath}?theme=${themeColor}`
    }
  }
  return link
}

const checkAndDisplayRemoveActions = async (adminYes, name, cardIdentifier) => {
  const latestBlockInfo = await getLatestBlockInfo()
  const isBlockPassed = latestBlockInfo.height >= GROUP_APPROVAL_FEATURE_TRIGGER_HEIGHT 
  let minAdminCount 
  const minterAdmins = await fetchMinterGroupAdmins()

  if ((minterAdmins) && (minterAdmins.length === 1)){
    console.warn(`simply a double-check that there is only one MINTER group admin, in which case the group hasn't been transferred to null...keeping default minAdminCount of: ${minAdminCount}`)
    minAdminCount = 9
  } else if ((minterAdmins) && (minterAdmins.length > 1) && isBlockPassed){
    const totalAdmins = minterAdmins.length
    const fortyPercent = totalAdmins * 0.40
    minAdminCount = Math.round(fortyPercent)
    console.warn(`this is another check to ensure minterAdmin group has more than 1 admin. IF so we will calculate the 40% needed for GROUP_APPROVAL, that number is: ${minAdminCount}`)
  }
  if (isBlockPassed && userState.isMinterAdmin) {
    console.warn(`feature trigger has passed, checking for approval requirements`)
    const addressInfo = await getNameInfo(name)
    const address = addressInfo.owner
    const kickApprovalHtml = await checkGroupApprovalAndCreateButton(address, cardIdentifier, "GROUP_KICK")
    const banApprovalHtml = await checkGroupApprovalAndCreateButton(address, cardIdentifier, "GROUP_BAN")
    
    if (kickApprovalHtml) {
      return kickApprovalHtml
    }

    if (banApprovalHtml) {
      return banApprovalHtml
    }
  }
  
  if (adminYes >= minAdminCount && userState.isMinterAdmin) {
    const removeButtonHtml = createRemoveButtonHtml(name, cardIdentifier)
    return removeButtonHtml
  } else{
    return ''
  }
  
}

const createRemoveButtonHtml = (name, cardIdentifier) => {
  return `
    <div id="remove-button-container-${cardIdentifier}" style="margin-top: 1em;">
      <button onclick="handleKickMinter('${name}')"
              style="padding: 10px; background: rgb(134, 80, 4); color: white; border: none; cursor: pointer; border-radius: 5px;"
              onmouseover="this.style.backgroundColor='rgb(47, 28, 11) '"
                  onmouseout="this.style.backgroundColor='rgb(134, 80, 4) '">
        KICK Minter
      </button>
      <button onclick="handleBanMinter('${name}')"
              style="padding: 10px; background:rgb(93, 7, 7); color: white; border: none; cursor: pointer; border-radius: 5px;"
              onmouseover="this.style.backgroundColor='rgb(39, 9, 9) '"
                  onmouseout="this.style.backgroundColor='rgb(93, 7, 7) '">
        BAN Minter
      </button>
    </div>
  `
}

const handleKickMinter = async (minterName) => {
  try {
    // Optional block check
    let txGroupId = 0
    const { height: currentHeight } = await getLatestBlockInfo()
    const isBlockPassed = currentHeight >= GROUP_APPROVAL_FEATURE_TRIGGER_HEIGHT
    if (isBlockPassed) {
      console.log(`block height above featureTrigger Height, using group approval method...txGroupId 694`)
      txGroupId = 694
    }

    // Get the minter address from name info
    const minterInfo = await getNameInfo(minterName)
    const minterAddress = minterInfo?.owner
    if (!minterAddress) {
      alert(`No valid address found for minter name: ${minterName}`)
      return
    }

    const adminPublicKey = await getPublicKeyByName(userState.accountName)
    const reason = 'Kicked by Minter Admins'
    const fee = 0.01

    const rawKickTransaction = await createGroupKickTransaction(minterAddress, adminPublicKey, 694, minterAddress, reason, txGroupId, fee)

    const signedKickTransaction = await qortalRequest({
      action: "SIGN_TRANSACTION",
      unsignedBytes: rawKickTransaction
    })
    
    let txToProcess = signedKickTransaction

    const processKickTx = await processTransaction(txToProcess)

    if (typeof processKickTx === 'object') {
      console.log("transaction success object:", processKickTx)
      alert(`${minterName} kick successfully issued! Wait for confirmation...Transaction Response: ${JSON.stringify(processKickTx)}`)
    } else {
      console.log("transaction raw text response:", processKickTx)
      alert(`TxResponse: ${JSON.stringify(processKickTx)}`)
    }

  } catch (error) {
    console.error("Error removing minter:", error)
    alert(`Error:${error}. Please try again.`)
  }
}

const handleBanMinter = async (minterName) => {
  try {
    let txGroupId = 0
    const { height: currentHeight } = await getLatestBlockInfo()
    if (currentHeight <= GROUP_APPROVAL_FEATURE_TRIGGER_HEIGHT) {
      console.log(`block height is under the removal featureTrigger height, using txGroupId 0`)
      txGroupId = 0
    } else {
      console.log(`featureTrigger block is passed, using txGroupId 694`)
      txGroupId = 694
    }

    const minterInfo = await getNameInfo(minterName)
    const minterAddress = minterInfo?.owner

    if (!minterAddress) {
      alert(`No valid address found for minter name: ${minterName}`)
      return
    }

    const adminPublicKey = await getPublicKeyByName(userState.accountName)
    const reason = 'Banned by Minter Admins'
    const fee = 0.01 

    const rawBanTransaction = await createGroupBanTransaction(minterAddress, adminPublicKey, 694, minterAddress, reason, txGroupId, fee)

    const signedBanTransaction = await qortalRequest({
      action: "SIGN_TRANSACTION",
      unsignedBytes: rawBanTransaction
    })

    let txToProcess = signedBanTransaction

    const processedTx = await processTransaction(txToProcess)

    if (typeof processedTx === 'object') {
      console.log("transaction success object:", processedTx)
      alert(`${minterName} BAN successfully issued! Wait for confirmation...Transaction Response: ${JSON.stringify(processedTx)}`)
    } else {
      // fallback string or something
      console.log("transaction raw text response:", processedTx)
      alert(`transaction response:${JSON.stringify(processedTx)}` )
    }

  } catch (error) {
    console.error("Error removing minter:", error)
    alert(`Error ${error}. Please try again.`)
  }
}

// Create the overall Minter Card HTML -----------------------------------------------
const createEncryptedCardHTML = async (cardData, pollResults, cardIdentifier, commentCount) => {
  const { minterName, header, content, links, creator, timestamp, poll, topicMode } = cardData
  const formattedDate = new Date(timestamp).toLocaleString()
  const minterAvatar = !topicMode ? await getMinterAvatar(minterName) : null
  const creatorAvatar = await getMinterAvatar(creator)
  const linksHTML = links.map((link, index) => `
    <button onclick="openLinkDisplayModal('${link}')">
      ${`Link ${index + 1} - ${link}`}
    </button>
  `).join("")

  const isUndefinedUser = (minterName === 'undefined')

  const hasTopicMode = Object.prototype.hasOwnProperty.call(cardData, 'topicMode')

  let showTopic = false

  if (hasTopicMode) {
    const modeVal = cardData.topicMode
    showTopic = (modeVal === true || modeVal === 'true')
  } else {
    if (!isUndefinedUser) {
      showTopic = false
    }
  }
 
  let cardColorCode = showTopic ? '#0e1b15' : '#151f28'

  const minterOrTopicHtml = ((showTopic) || (isUndefinedUser)) ? `
    <div class="support-header"><h5> REGARDING (Topic): </h5></div>
    <h3>${minterName}</h3>` :
    `
    <div class="support-header"><h5> REGARDING (Name): </h5></div>
    ${minterAvatar}
    <h3>${minterName}</h3>`

  const minterGroupMembers = await fetchMinterGroupMembers()
  const minterAdmins = await fetchMinterGroupAdmins()
  const { adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, totalYes = 0, totalNo = 0, totalYesWeight = 0, totalNoWeight = 0, detailsHtml } = await processPollData(pollResults, minterGroupMembers, minterAdmins, creator, cardIdentifier)

  createModal('links')
  createModal('poll-details')

  let showRemoveHtml
  let altText
  const verifiedName = await validateMinterName(minterName)

  if (verifiedName) {
    const accountInfo = await getNameInfo(verifiedName)
    const accountAddress = accountInfo.owner
    console.log(`name is validated, utilizing for removal features...${verifiedName}`)
    const removeActionsHtml = await checkAndDisplayRemoveActions(adminYes, verifiedName, cardIdentifier)
    showRemoveHtml = removeActionsHtml
    
    if (banTransactions.some((banTx) => banTx.groupId === 694 && banTx.offender === accountAddress)){
      console.warn(`account was already banned, displaying as such...`)
      cardColorCode = 'rgb(24, 3, 3)'
      altText  = `<h4 style="color:rgb(106, 2, 2); margin-bottom: 0.5em;">BANNED From MINTER Group</h4>`
      showRemoveHtml = ''
    }
    
    if (kickTransactions.some((kickTx) => kickTx.groupId === 694 && kickTx.member === accountAddress)){
      console.warn(`account was already kicked, displaying as such...`)
      cardColorCode = 'rgb(29, 7, 4)'
      altText  = `<h4 style="color:rgb(143, 117, 21); margin-bottom: 0.5em;">KICKED From MINTER Group</h4>`
      showRemoveHtml = ''
    }
    
  } else {
    console.log(`name could not be validated, assuming topic card (or some other issue with name validation) for removalActions`)
    showRemoveHtml = ''
  }

  return `
  <div class="admin-card" style="background-color: ${cardColorCode}">
    <div class="minter-card-header">
      <h2 class="support-header"> Created By: </h2>
      ${creatorAvatar}
      <h2>${creator}</h2>
      ${minterOrTopicHtml}
      <p>${header}</p>
      ${altText}
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
      <button onclick="togglePollDetails('${cardIdentifier}')">Display Poll Details</button>
      <div id="poll-details-${cardIdentifier}" style="display: none;">
        ${detailsHtml}
      </div>
      ${showRemoveHtml}
      <div class="admin-results">
        <span class="admin-yes">Admin Support: ${adminYes}</span>
        <span class="admin-no">Admin Against: ${adminNo}</span>
      </div>
      <div class="minter-results">
        <span class="minter-yes">Supporting Weight ${totalYesWeight}</span>
        <span class="minter-no">Denial Weight ${totalNoWeight}</span>
      </div>
    </div>
    <div class="support-header"><h5>ACTIONS FOR</h5><h5 style="color: #ffae42;">${minterName}</h5>
    <p style="color: #c7c7c7; font-size: .65rem; margin-top: 1vh">(click COMMENTS button to open/close card comments)</p>
    </div>
    <div class="actions">
      <div class="actions-buttons">
        <button class="yes" onclick="voteYesOnPoll('${poll}')">YES</button>
        <button id="comment-button-${cardIdentifier}" data-comment-count="${commentCount}" class="comment" onclick="toggleEncryptedComments('${cardIdentifier}')">COMMENTS (${commentCount})</button>
        <button class="no" onclick="voteNoOnPoll('${poll}')">NO</button>
      </div>
    </div>
    <div id="comments-section-${cardIdentifier}" class="comments-section" style="display: none; margin-top: 20px;">
      <div id="comments-container-${cardIdentifier}" class="comments-container"></div>
      <textarea id="new-comment-${cardIdentifier}" placeholder="Input your comment..." style="width: 100%; margin-top: 10px;"></textarea>
      <button onclick="postEncryptedComment('${cardIdentifier}')">Post Comment</button>
    </div>
    <p style="font-size: 0.75rem; margin-top: 1vh; color: #4496a1">By: ${creator} - ${formattedDate}</p>
  </div>
  `
}

