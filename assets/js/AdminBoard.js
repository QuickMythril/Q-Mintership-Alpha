// NOTE - Change isTestMode to false prior to actual release ---- !important - You may also change identifier if you want to not show older cards.
const isEncryptedTestMode = false
const encryptedCardIdentifierPrefix = "card-MAC"
let isExistingEncryptedCard = false
let existingDecryptedCardData = {}
let existingEncryptedCardIdentifier = {}
let cardMinterName = {}
let existingCardMinterNames = []
let isTopic = false
let attemptLoadAdminDataCount = 0
let adminMemberCount = 0
let adminPublicKeys = []

console.log("Attempting to load AdminBoard.js")

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
        <h3>Create or Update Your Minter Card</h3>
        <div class="publish-card-checkbox" style="margin-top: 1em;">
          <input type="checkbox" id="topic-checkbox" name="topicMode" />
          <label for="topic-checkbox">Is this a Topic instead of a Minter?</label>
        </div>
        <label for="minter-name-input">Input Topic or Minter Name:</label>
        <input type="text" id="minter-name-input" maxlength="100" placeholder="Enter Topic or Minter's Name" required>
        <label for="card-header">Header:</label>
        <input type="text" id="card-header" maxlength="100" placeholder="Explain main point/issue" required>
        <label for="card-content">Content:</label>
        <textarea id="card-content" placeholder="Enter any information you like...You may also attach links to more in-depth information, etc. (Links will pop-up in a custom in-app viewer upon being clicked.)" required></textarea>
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
    event.preventDefault()
    const isTopicChecked = document.getElementById("topic-checkbox").checked
  
    // Pass that boolean to publishEncryptedCard
    await publishEncryptedCard(isTopicChecked)
  })

  // await fetchAndValidateAllAdminCards()
  await fetchAllEncryptedCards()
  await updateOrSaveAdminGroupsDataLocally()
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

const processCards = async (validEncryptedCards) => {
  const latestCardsMap = new Map()

  // Step 1: Process all cards in parallel
  await Promise.all(validEncryptedCards.map(async card => {
    const timestamp = card.updated || card.created || 0
    const existingCard = latestCardsMap.get(card.identifier)

    if (!existingCard || timestamp > (existingCard.updated || existingCard.created || 0)) {
      latestCardsMap.set(card.identifier, card)
    }
  }))

  console.log(`latestCardsMap, by timestamp`, latestCardsMap)

  // Step 2: Extract unique cards
  const uniqueValidCards = Array.from(latestCardsMap.values())

  return uniqueValidCards
}


//Main function to load the Minter Cards ----------------------------------------
const fetchAllEncryptedCards = async () => {
  const encryptedCardsContainer = document.getElementById("encrypted-cards-container")
  encryptedCardsContainer.innerHTML = "<p>Loading cards...</p>"

  try {
    const response = await searchSimple('MAIL_PRIVATE', `${encryptedCardIdentifierPrefix}`, '', 0)

    if (!response || !Array.isArray(response) || response.length === 0) {
      encryptedCardsContainer.innerHTML = "<p>No cards found.</p>"
      return
    }

    // Validate cards and filter
    const validatedEncryptedCards = await Promise.all(
      response.map(async card => {
        const isValid = await validateEncryptedCardIdentifier(card)
        return isValid ? card : null
      })
    )
    console.log(`validatedEncryptedCards:`, validatedEncryptedCards, `... running next filter...`)

    const validEncryptedCards = validatedEncryptedCards.filter(card => card !== null)
    console.log(`validEncryptedcards:`, validEncryptedCards)
    
    if (validEncryptedCards.length === 0) {
      encryptedCardsContainer.innerHTML = "<p>No valid cards found.</p>";
      return;
    }
    const finalCards = await processCards(validEncryptedCards)
    
    console.log(`finalCards:`,finalCards)
    // Display skeleton cards immediately
    encryptedCardsContainer.innerHTML = ""
    finalCards.forEach(card => {
      const skeletonHTML = createSkeletonCardHTML(card.identifier)
      encryptedCardsContainer.insertAdjacentHTML("beforeend", skeletonHTML)
    })

    // Fetch and update each card
    finalCards.forEach(async card => {
      try {
        const hasMinterName = await extractEncryptedCardsMinterName(card.identifier)
        if (hasMinterName) existingCardMinterNames.push(hasMinterName)

        const cardDataResponse = await qortalRequest({
          action: "FETCH_QDN_RESOURCE",
          name: card.name,
          service: "MAIL_PRIVATE",
          identifier: card.identifier,
          encoding: "base64"
        })

        if (!cardDataResponse) {
          console.warn(`Skipping invalid card: ${JSON.stringify(card)}`)
          removeSkeleton(card.identifier)
          return
        }

        const decryptedCardData = await decryptAndParseObject(cardDataResponse)

        // Skip cards without polls
        if (!decryptedCardData.poll) {
          console.warn(`Skipping card with no poll: ${card.identifier}`)
          removeSkeleton(card.identifier)
          return
        }

        const encryptedCardPollPublisherPublicKey = await getPollPublisherPublicKey(decryptedCardData.poll)
        const encryptedCardPublisherPublicKey = await getPublicKeyByName(card.name)

        if (encryptedCardPollPublisherPublicKey != encryptedCardPublisherPublicKey) {
          console.warn(`QuickMythril cardPollHijack attack found! Not including card with identifier: ${card.identifier}`)
          return
        }

        // Fetch poll results
        const pollResults = await fetchPollResults(decryptedCardData.poll)

        if (pollResults?.error) {
          console.warn(`Skipping card with non-existent poll: ${card.identifier}, poll=${decryptedCardData.poll}`)
          removeSkeleton(card.identifier)
          return
        }
        // const minterNameFromIdentifier = await extractCardsMinterName(card.identifier);
        const encryptedCommentCount = await getEncryptedCommentCount(card.identifier)
        // Generate final card HTML
        
        const finalCardHTML = await createEncryptedCardHTML(decryptedCardData, pollResults, card.identifier, encryptedCommentCount)
        replaceEncryptedSkeleton(card.identifier, finalCardHTML)
      } catch (error) {
        console.error(`Error processing card ${card.identifier}:`, error)
        removeSkeleton(card.identifier)
      }
    })

  } catch (error) {
    console.error("Error loading cards:", error)
    encryptedCardsContainer.innerHTML = "<p>Failed to load cards.</p>"
  }
}


const removeEncryptedSkeleton = (cardIdentifier) => {
  const encryptedSkeletonCard = document.getElementById(`skeleton-${cardIdentifier}`)
  if (encryptedSkeletonCard) {
    encryptedSkeletonCard.remove(); // Remove the skeleton silently
  }
}

const replaceEncryptedSkeleton = (cardIdentifier, htmlContent) => {
  const encryptedSkeletonCard = document.getElementById(`skeleton-${cardIdentifier}`)
  if (encryptedSkeletonCard) {
    encryptedSkeletonCard.outerHTML = htmlContent;
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
const fetchExistingEncryptedCard = async (minterName) => {
  try {
    const response = await searchSimple('MAIL_PRIVATE', `${encryptedCardIdentifierPrefix}`, minterName, 0)

    console.log(`SEARCH_QDN_RESOURCES response: ${JSON.stringify(response, null, 2)}`)

    // Step 2: Check if the response is an array and not empty
    if (!response || !Array.isArray(response) || response.length === 0) {
      console.log("No cards found for the current user.")
      return null
    }

    // Step 3: Validate cards asynchronously
    const validatedCards = await Promise.all(
      response.map(async card => {
        const isValid = await validateEncryptedCardIdentifier(card)
        return isValid ? card : null
      })
    )

    // Step 4: Filter out invalid cards
    const validCards = validatedCards.filter(card => card !== null)

    if (validCards.length > 0) {
      // Step 5: Sort by most recent timestamp
      const mostRecentCard = validCards.sort((a, b) => b.created - a.created)[0]

      // Step 6: Fetch full card data
      const cardDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: mostRecentCard.name, 
        service: mostRecentCard.service,
        identifier: mostRecentCard.identifier,
        encoding: "base64"
      })

      existingEncryptedCardIdentifier = mostRecentCard.identifier

      existingDecryptedCardData = await decryptAndParseObject(cardDataResponse)
      console.log("Full card data fetched successfully:", existingDecryptedCardData)

      return existingDecryptedCardData
    }

    console.log("No valid cards found.")
    return null
  } catch (error) {
    console.error("Error fetching existing card:", error);
    return null
  }
}

// Validate that a card is indeed a card and not a comment. -------------------------------------
const validateEncryptedCardIdentifier = async (card) => {
  return (
    typeof card === "object" &&
    card.name &&
    card.service === "MAIL_PRIVATE" &&
    card.identifier && !card.identifier.includes("comment") &&
    card.created
  )
}

// Load existing card data passed, into the form for editing -------------------------------------
const loadEncryptedCardIntoForm = async () => {
  if (existingDecryptedCardData) {
    console.log("Loading existing card data:", existingDecryptedCardData);
    document.getElementById("minter-name-input").value = existingDecryptedCardData.minterName
    document.getElementById("card-header").value = existingDecryptedCardData.header
    document.getElementById("card-content").value = existingDecryptedCardData.content

    const linksContainer = document.getElementById("links-container")
    linksContainer.innerHTML = ""; // Clear previous links
    existingDecryptedCardData.links.forEach(link => {
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
      alert(`"${minterNameInput}" doesn't seem to be a valid Minter name. Please check or use topic mode.`)
      return
    }
    // Also check for existing card if not topic
    if (!isExistingEncryptedCard && existingCardMinterNames.includes(publishedMinterName)) {
      const updateCard = confirm(
        `Minter Name: ${publishedMinterName} already has a card. Update or Cancel?`
      )
      if (updateCard) {
        await fetchExistingEncryptedCard(publishedMinterName)
        await loadEncryptedCardIntoForm()
        isExistingEncryptedCard = true
        return
      } else {
        return
      }
    }
  }

  // Determine final card identifier
  const newCardIdentifier = isTopic
    ? `${encryptedCardIdentifierPrefix}-TOPIC-${await uid()}`
    : `${encryptedCardIdentifierPrefix}-${publishedMinterName}-${await uid()}`

  const cardIdentifier = isExistingEncryptedCard ? existingEncryptedCardIdentifier : newCardIdentifier

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
    if (!isExistingEncryptedCard) {
      await qortalRequest({
        action: "CREATE_POLL",
        pollName,
        pollDescription: `Admin Board Poll Published By ${userState.accountName}`,
        pollOptions: ["Yes, No"],
        pollOwnerAddress: userState.accountAddress
      })
      alert("Card and poll published successfully!")
      
      // If it’s a real Minter name, store it so we know we have a card for them
      if (!isTopic) {
        if (!existingCardMinterNames.contains(publishedMinterName)) {
          existingCardMinterNames.push(publishedMinterName)
        }
      }

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
      return response;
    }
  } catch (error) {
    console.error(`Error fetching comments for ${cardIdentifier}:`, error)
    return []
  }
}

// display the comments on the card, with passed cardIdentifier to identify the card --------------
const displayEncryptedComments = async (cardIdentifier) => {
  try {
    const comments = await fetchEncryptedComments(cardIdentifier)
    const commentsContainer = document.getElementById(`comments-container-${cardIdentifier}`)
    
    for (const comment of comments) {
      const commentDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: comment.name,
        service: "MAIL_PRIVATE",
        identifier: comment.identifier,
        encoding: "base64"
      })

      const decryptedCommentData = await decryptAndParseObject(commentDataResponse)
      const timestampCheck = comment.updated || comment.created || 0
      const timestamp = await timestampToHumanReadableDate(timestampCheck)
      //TODO - add fetching of poll results and checking to see if the commenter has voted and display it as 'supports minter' section.
      const commentHTML = `
        <div class="comment" style="border: 1px solid gray; margin: 1vh 0; padding: 1vh; background: #1c1c1c;">
          <p><strong><u>${decryptedCommentData.creator}</strong>:</p></u>
          <p>${decryptedCommentData.content}</p>
          <p><i>${timestamp}</p></i>
        </div>
      `
      commentsContainer.insertAdjacentHTML('beforeend', commentHTML)
    }
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
  const modal = document.getElementById('links-modal');
  const modalContent = document.getElementById('links-modalContent');
  modalContent.src = processedLink; // Set the iframe source to the link
  modal.style.display = 'block'; // Show the modal
}

// Function to close the modal
const closeLinkDisplayModal = async () => {
  const modal = document.getElementById('links-modal');
  const modalContent = document.getElementById('links-modalContent');
  modal.style.display = 'none'; // Hide the modal
  modalContent.src = ''; // Clear the iframe source
}

const processQortalLinkForRendering = async (link) => {
  if (link.startsWith('qortal://')) {
    const match = link.match(/^qortal:\/\/([^/]+)(\/.*)?$/)
    if (match) {
      const firstParam = match[1].toUpperCase();
      const remainingPath = match[2] || ""
      const themeColor = window._qdnTheme || 'default' // Fallback to 'default' if undefined
      // Simulating async operation if needed
      await new Promise(resolve => setTimeout(resolve, 10))
      
      return `/render/${firstParam}${remainingPath}?theme=${themeColor}`
    }
  }
  return link
}

const getMinterAvatar = async (minterName) => {
  const avatarUrl = `/arbitrary/THUMBNAIL/${minterName}/qortal_avatar`
  try {
    const response = await fetch(avatarUrl, { method: 'HEAD' })

    if (response.ok) {
      return `<img src="${avatarUrl}" alt="User Avatar" class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; align-self: center;">`
    } else {
      return ''
    }

  } catch (error) {
    console.error('Error checking avatar availability:', error)
    return ''
  }
}

// const togglePollDetails = (cardIdentifier) => {  
//   const detailsDiv = document.getElementById(`poll-details-${cardIdentifier}`)
//   const modal = document.getElementById(`poll-details-modal`)
//   const modalContent = document.getElementById(`poll-details-modalContent`)
  
//   if (!detailsDiv || !modal || !modalContent) return

//   modalContent.appendChild(detailsDiv)
//   modal.style.display = 'block'
//   window.onclick = (event) => {
//     if (event.target === modal) {
//       modal.style.display = 'none'
//     }
//   }
// }

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
 
  const cardColorCode = showTopic ? '#0e1b15' : '#151f28'

  const minterOrTopicHtml = ((showTopic) || (isUndefinedUser)) ? `
    <div class="support-header"><h5> REGARDING (Topic): </h5></div>
    <h3>${minterName}</h3>` :
    `
    <div class="support-header"><h5> REGARDING (Name): </h5></div>
    ${minterAvatar}
    <h3>${minterName}</h3>`

  const minterGroupMembers = await fetchMinterGroupMembers()
  const minterAdmins = await fetchMinterGroupAdmins()
  const { adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, totalYes = 0, totalNo = 0, totalYesWeight = 0, totalNoWeight = 0, detailsHtml } = await processPollData(pollResults, minterGroupMembers, minterAdmins, creator)
  createModal('links')
  createModal('poll-details')
  return `
  <div class="admin-card" style="background-color: ${cardColorCode}">
    <div class="minter-card-header">
      <h2 class="support-header"> Created By: </h2>
      ${creatorAvatar}
      <h2>${creator}</h2>
      ${minterOrTopicHtml}
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
      <button onclick="togglePollDetails('${cardIdentifier}')">Display Poll Details</button>
      <div id="poll-details-${cardIdentifier}" style="display: none;">
        ${detailsHtml}
      </div>
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

