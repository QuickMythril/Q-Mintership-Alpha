
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
// let kickTransactions = []
// let banTransactions = []
let adminBoardState = {
  kickedCards: new Set(),  // store identifiers 
  bannedCards: new Set(),  // likewise
  hiddenList: new Set(),   // user-hidden
  // ... we can add other things to state if needed...
}

const loadAdminBoardState = () => {
  // Load from localStorage if available
  const rawState = localStorage.getItem('adminBoardState')
  if (rawState) {
    try {
      const parsed = JSON.parse(rawState);
      // Make sure bannedCards and kickedCards are sets
      return {
        bannedCards: new Set(parsed.bannedCards ?? []),
        kickedCards: new Set(parsed.kickedCards ?? []),
        hiddenList: new Set(parsed.hiddenList ?? []),
        // ... any other fields
      };
    } catch (e) {
      console.warn("Failed to parse adminBoardState from storage:", e)
    }
  }
  // If nothing found or parse error, return a default
  return {
    bannedCards: new Set(),
    kickedCards: new Set(),
    hiddenList: new Set(),
  }
}

// Saving the state back into localStorage as needed:
const saveAdminBoardState = () => {
  const stateToSave = {
    bannedCards: Array.from(adminBoardState.bannedCards),
    kickedCards: Array.from(adminBoardState.kickedCards),
    hiddenList: Array.from(adminBoardState.hiddenList),
  }
  localStorage.setItem('adminBoardState', JSON.stringify(stateToSave))
}

console.log("Attempting to load AdminBoard.js")

const loadAdminBoardPage = async () => {
  // Clear existing content on the page
  const bodyChildren = document.body.children

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
    <p style="font-size: 0.95rem; color:rgba(255, 255, 255, 0.53)"> The Admin Board was meant to be utilized for DECISIONS regarding Minters or would-be Minters, and is encrypted to the Admins so that the data for the DECISIONS remains private. However, it later became the location to REMOVE minters as well. This, not being the original intended purpose has become problematic, as the removal data SHOULD be public. In the future, this data WILL be made public. The Admin Board will continue to be utilized for decision-making, but will NOT be a place for hidden removal data only. </p>
    <button id="publish-card-button" class="publish-card-button" style="margin: 20px; padding: 10px;">Publish Encrypted Card</button>
    <button id="refresh-cards-button" class="refresh-cards-button" style="padding: 10px;">Refresh Cards</button>
    <select id="sort-select" style="margin-left: 10px; padding: 5px; font-size: 1.25rem; color:rgb(70, 106, 105); background-color: black;">
      <option value="newest" selected>Sort by Date</option>
      <option value="name">Sort by Name</option>
      <option value="recent-comments">Newest Comments</option>
      <option value="least-votes">Least Votes</option>
      <option value="most-votes">Most Votes</option>
    </select>
    <select id="time-range-select" style="margin-left: 10px; padding: 5px; font-size: 1.25rem; color: white; background-color: black;">
      <option value="0">All Creation Dates</option>
      <option value="1">Last 1 Day</option>
      <option value="7">Last 7 Days</option>
      <option value="30">...Within 30 Days</option>
      <option value="45" selected>Published Within Last 45 Days</option>
      <option value="60">...Within 60 Days</option>
      <option value="90">...Within 90 Days</option>
    </select>
    <div class="show-card-checkbox" style="margin-top: 1em;">
      <input type="checkbox" id="admin-show-hidden-checkbox" name="adminHidden" />
      <label for="admin-show-hidden-checkbox">Show User-Hidden Cards?</label>
      <input type="checkbox" id="admin-show-kicked-banned-checkbox" name="kickedBanned" />
      <label for="admin-show-kicked-banned-checkbox">Show Kicked / Banned Cards?</label>
    </div>
    <div id="encrypted-cards-container" class="cards-container" style="margin-top: 20px;"></div>
    <div id="publish-card-view" class="publish-card-view" style="display: none; text-align: left; padding: 20px;">
        <form id="publish-card-form" class="publish-card-form">
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

  const showKickedBannedCheckbox = document.getElementById('admin-show-kicked-banned-checkbox')

  if (showKickedBannedCheckbox) {
    showKickedBannedCheckbox.addEventListener('change', async (event) => {
      await fetchAllEncryptedCards(true);
    })
  }

  const showHiddenCardsCheckbox = document.getElementById('admin-show-hidden-checkbox')
  if (showHiddenCardsCheckbox) {
    showHiddenCardsCheckbox.addEventListener('change', async (event) => {
      await fetchAllEncryptedCards(true)
    })
  }
  
  
  document.getElementById("publish-card-form").addEventListener("submit", async (event) => {
    event.preventDefault()
    const isTopicChecked = document.getElementById("topic-checkbox").checked
    // Pass that boolean to publishEncryptedCard
    await publishEncryptedCard(isTopicChecked)
  })

  document.getElementById("sort-select").addEventListener("change", async () => {
    // Re-load the cards whenever user chooses a new sort option.
    await fetchAllEncryptedCards()
  })

  createScrollToTopButton()
  // await fetchAndValidateAllAdminCards()
  await updateOrSaveAdminGroupsDataLocally()
  await fetchAllEncryptedCards()  
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
    }

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
      return null
    }
    // Parse the JSON, then store the global variables.
    const parsedData = JSON.parse(storedData)
    
    adminMemberCount = parsedData.keysCount
    adminPublicKeys = parsedData.publicKeys

    console.log(typeof adminPublicKeys) // Should be "object"
    console.log(Array.isArray(adminPublicKeys))

    console.log(`Loaded admins 'keysCount'=${adminMemberCount}, publicKeys=`, adminPublicKeys)
    attemptLoadAdminDataCount = 0

    return parsedData // and return { adminMemberCount, adminKeys } to the caller
  } catch (error) {
    console.error('Error loading/parsing saved admin public keys:', error)
    return null
  }
}

const extractEncryptedCardsMinterName = (cardIdentifier) => {
  const parts = cardIdentifier.split('-')
  // Ensure the format has at least 3 parts
  if (parts.length < 3) {
    throw new Error('Invalid identifier format')
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

  let afterTime = null
  const timeRangeSelect = document.getElementById("time-range-select")
  if (timeRangeSelect) {
    const days = parseInt(timeRangeSelect.value, 10)
    if (days > 0) {
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000
      afterTime = now - days * dayMs  // e.g. last X days
      console.log(`afterTime for last ${days} days = ${new Date(afterTime).toLocaleString()}`)
    }
  }

  try {
    const response = await searchSimple('MAIL_PRIVATE', `${encryptedCardIdentifierPrefix}`, '', 0, 0, '', false, true, afterTime)

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
      return
    }

    // Combine `processCards` logic: Deduplicate cards by identifier and keep latest timestamp
    const latestCardsMap = new Map()

    validCardsWithData.forEach(({ card, decryptedCardData }) => {
      const timestamp = card.created || 0
      const existingCard = latestCardsMap.get(card.identifier)

      if (!existingCard || timestamp < (existingCard.card.updated || existingCard.card.created || 0)) {
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

        if (obtainedMinterName) {
          const existingEntry = mostRecentCardsMap.get(obtainedMinterName)

          if (!existingEntry) {
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
    const finalCards = Array.from(mostRecentCardsMap.values())

    let selectedSort = 'newest'
    const sortSelect = document.getElementById('sort-select')
    if (sortSelect) {
      selectedSort = sortSelect.value
    }

    if (selectedSort === 'name') {
	      // Sort alphabetically by the minter's name
      finalCards.sort((a, b) => {
        const nameA = a.decryptedCardData.minterName?.toLowerCase() || ''
        const nameB = b.decryptedCardData.minterName?.toLowerCase() || ''
        return nameA.localeCompare(nameB)
      })
    } else if (selectedSort === 'recent-comments') {
	      // We need each card's newest comment timestamp for sorting
      for (let card of finalCards) {
        card.newestCommentTimestamp = await getNewestAdminCommentTimestamp(card.card.identifier)
      }
      // Then sort descending by newest comment
      finalCards.sort((a, b) =>
        (b.newestCommentTimestamp || 0) - (a.newestCommentTimestamp || 0)
      )
    } else if (selectedSort === 'least-votes') {
      // TODO: Add the logic to sort by LEAST total ADMIN votes, then totalYesWeight
      const minterGroupMembers = await fetchMinterGroupMembers()
      const minterAdmins = await fetchMinterGroupAdmins()
      for (const finalCard of finalCards) {
        try {
          const pollName = finalCard.decryptedCardData.poll
          // If card or poll is missing, default to zero
          if (!pollName) {
            finalCard._adminTotalVotes = 0
            finalCard._yesWeight = 0
            continue
          }
          const pollResults = await fetchPollResults(pollName)
          if (!pollResults || pollResults.error) {
            finalCard._adminTotalVotes = 0
            finalCard._yesWeight = 0
            continue
          }
          // Pull only the adminYes/adminNo/totalYesWeight from processPollData
          const {
            adminYes,
            adminNo,
            totalYesWeight
          } = await processPollData(
            pollResults,
            minterGroupMembers,
            minterAdmins,
            finalCard.decryptedCardData.creator,
            finalCard.card.identifier
          )
          finalCard._adminTotalVotes = adminYes + adminNo
          finalCard._yesWeight = totalYesWeight
        } catch (error) {
          console.warn(`Error fetching or processing poll for card ${finalCard.card.identifier}:`, error)
          finalCard._adminTotalVotes = 0
          finalCard._yesWeight = 0
        }
      }
      // Sort ascending by (adminYes + adminNo), then descending by totalYesWeight
      finalCards.sort((a, b) => {
        const diffAdminTotal = a._adminTotalVotes - b._adminTotalVotes
        if (diffAdminTotal !== 0) return diffAdminTotal
        // If there's a tie, show the card with higher yesWeight first
        return b._yesWeight - a._yesWeight
      })
    } else if (selectedSort === 'most-votes') {
      // TODO: Add the logic to sort by MOST total ADMIN votes, then totalYesWeight
      const minterGroupMembers = await fetchMinterGroupMembers()
      const minterAdmins = await fetchMinterGroupAdmins()
      for (const finalCard of finalCards) {
        try {
          const pollName = finalCard.decryptedCardData.poll
          if (!pollName) {
            finalCard._adminTotalVotes = 0
            finalCard._yesWeight = 0
            continue
          }
          const pollResults = await fetchPollResults(pollName)
          if (!pollResults || pollResults.error) {
            finalCard._adminTotalVotes = 0
            finalCard._yesWeight = 0
            continue
          }
          const {
            adminYes,
            adminNo,
            totalYesWeight
          } = await processPollData(
            pollResults,
            minterGroupMembers,
            minterAdmins,
            finalCard.decryptedCardData.creator,
            finalCard.card.identifier
          )
          finalCard._adminTotalVotes = adminYes + adminNo
          finalCard._yesWeight = totalYesWeight
        } catch (error) {
          console.warn(`Error fetching or processing poll for card ${finalCard.card.identifier}:`, error)
          finalCard._adminTotalVotes = 0
          finalCard._yesWeight = 0
        }
      }
      // Sort descending by (adminYes + adminNo), then descending by totalYesWeight
      finalCards.sort((a, b) => {
        const diffAdminTotal = b._adminTotalVotes - a._adminTotalVotes
        if (diffAdminTotal !== 0) return diffAdminTotal
        return b._yesWeight - a._yesWeight
      })
    } else {
      // Sort cards by timestamp (most recent first)
      finalCards.sort((a, b) => {
        const timestampA = a.card.updated || a.card.created || 0
        const timestampB = b.card.updated || b.card.created || 0
        return timestampB - timestampA;
      })
    }

    encryptedCardsContainer.innerHTML = ""

    const finalVisualFilterCards = finalCards.filter(({card}) => {
      const showKickedBanned = document.getElementById('admin-show-kicked-banned-checkbox')?.checked ?? false
      const showHiddenAdminCards = document.getElementById('admin-show-hidden-checkbox')?.checked ?? false

      if (!showKickedBanned){
        if (adminBoardState.bannedCards.has(card.identifier)) {
          return false // skip
        }

        if (adminBoardState.kickedCards.has(card.identifier)) {
          return false // skip
        }
      } 
      
      if (!showHiddenAdminCards) {
        if (adminBoardState.hiddenList.has(card.identifier)) {
          return false // skip
        }
      }
      
      return true
    })
    console.warn(`sharing current adminBoardState...`,adminBoardState)
    // Display skeleton cards immediately
    finalVisualFilterCards.forEach(({ card }) => {
      const skeletonHTML = createSkeletonCardHTML(card.identifier)
      encryptedCardsContainer.insertAdjacentHTML("beforeend", skeletonHTML)
    }) 

    // Fetch poll results and update each card
    await Promise.all(
      finalVisualFilterCards.map(async ({ card, decryptedCardData }) => {
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
          if ((!finalCardHTML) || (finalCardHTML === '')){
            removeSkeleton(card.identifier)
          }
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
    console.log("Loading existing card data:", decryptedCardData)
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
    if (name) {
      console.log(`name information found, returning:`, name)
      return name
    } else {
      console.warn(`no name information found, this is not a registered name: '${minterName}', Returning null`, name)
      return null
    }
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
    let minterAddress
    publishedMinterName = await validateMinterName(minterNameInput)
    if (!publishedMinterName) {
      try {
        const addressInfo = await getAddressInfo(minterNameInput)
        if (addressInfo) {
          console.warn(`checked minterNameInput and found it to be an address... proceeding accordingly.`)
          minterAddress = addressInfo.address
          publishedMinterName = addressInfo.address
        } else {
          alert(`"${minterNameInput}" doesn't seem to be a valid name or address. Please check or use topic mode.`)
          return
        }
      } catch (error) {
        console.warn(`error checking for address...?`, error)
        alert(`Failed to verify name/address. Please try again, or change to topicMode to publish anything else.`)
        return
      }
    }    
    // Also check for existing card if not topic
    if (!isUpdateCard && existingCardMinterNames.some(item => item.minterName === publishedMinterName)) {
      const duplicateCardData = existingCardMinterNames.find(item => item.minterName === publishedMinterName)
      const updateCard = confirm(
        `Minter Name: ${publishedMinterName} already has a card. (NOTE this update functionality is no longer functional, it may or may not come back. Even if you update the card you won't see it. It is suggested to CANCEL and use topic mode.`
      )
      if (updateCard) {
        existingEncryptedCardIdentifier = duplicateCardData.identifier
        isUpdateCard = true
      } else {
        return
      }
    }
  }
  if (!publishedMinterName && minterAddress){
    console.log(`No name was found, but an address was, publishing address in cardData, and using address as name for card.`)
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

    // Possibly create a poll if it's a brand new card
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
    // alert('Comment posted successfully!')
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

const checkAndDisplayRemoveActions = async (adminYes, name, cardIdentifier, nameIsActuallyAddress = false) => {
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
    minAdminCount = Math.ceil(fortyPercent)
    console.warn(`this is another check to ensure minterAdmin group has more than 1 admin. IF so we will calculate the 40% needed for GROUP_APPROVAL, that number is: ${minAdminCount}`)
  }
  if (isBlockPassed && (userState.isMinterAdmin || userState.isAdmin)) {
    console.warn(`feature trigger has passed, checking for approval requirements`)
    let address 
    if (!nameIsActuallyAddress){
      const nameInfo = await getNameInfo(name)
      address = nameInfo.owner
    } else {
      address = name
    }
    const kickApprovalHtml = await checkGroupApprovalAndCreateButton(address, cardIdentifier, "GROUP_KICK")
    const banApprovalHtml = await checkGroupApprovalAndCreateButton(address, cardIdentifier, "GROUP_BAN")
    
    if (kickApprovalHtml) {
      return kickApprovalHtml
    }

    if (banApprovalHtml) {
      return banApprovalHtml
    }
  }
  
  if (adminYes >= minAdminCount && (userState.isMinterAdmin || userState.isAdmin)) {
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
        Create KICK Tx
      </button>
      <button onclick="handleBanMinter('${name}')"
              style="padding: 10px; background:rgb(93, 7, 7); color: white; border: none; cursor: pointer; border-radius: 5px;"
              onmouseover="this.style.backgroundColor='rgb(39, 9, 9) '"
                  onmouseout="this.style.backgroundColor='rgb(93, 7, 7) '">
        Create BAN Tx
      </button>
    </div>
  `
}

const handleKickMinter = async (minterName) => {
  try {
    let isAddress = await getAddressInfo(minterName)

    // Optional block check
    let txGroupId = 0
    // const { height: currentHeight } = await getLatestBlockInfo()
    const isBlockPassed = await featureTriggerCheck()
    if (isBlockPassed) {
      console.log(`block height above featureTrigger Height, using group approval method...txGroupId 694`)
      txGroupId = 694
    }

    // Get the minter address from name info
    let minterAddress
    if (!isAddress.address || isAddress.address !== minterName){
      const minterNameInfo = await getNameInfo(minterName)
      minterAddress = minterNameInfo?.owner
    } else {
      minterAddress = minterName
    }
    
    if (!minterAddress) {
      alert(`No valid address found for minter name: ${minterName}, this should NOT have happened, please report to developers...`)
      return
    }

    const adminPublicKey = await getPublicKeyFromAddress(userState.accountAddress)
    const reason = 'Kicked by Minter Admins'
    const fee = 0.01

    const rawKickTransaction = await createGroupKickTransaction(adminPublicKey, 694, minterAddress, reason, txGroupId, fee)

    const signedKickTransaction = await qortalRequest({
      action: "SIGN_TRANSACTION",
      unsignedBytes: rawKickTransaction
    })
    if (!signedKickTransaction) {
      console.warn(`this only happens if the SIGN_TRANSACTION qortalRequest failed... are you using the legacy UI prior to this qortalRequest being added?`)
      alert(`this only happens if the SIGN_TRANSACTION qortalRequest failed... are you using the legacy UI prior to this qortalRequest being added? Please talk to developers.`)
      return
    }
    
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
  let isAddress = await getAddressInfo(minterName)
  try {
    let txGroupId = 0
    // const { height: currentHeight } = await getLatestBlockInfo()
    const isBlockPassed = await featureTriggerCheck()
    if (!isBlockPassed) {
      console.log(`block height is under the removal featureTrigger height, using txGroupId 0`)
      txGroupId = 0
    } else {
      console.log(`featureTrigger block is passed, using txGroupId 694`)
      txGroupId = 694
    }
    let minterAddress
    if (!isAddress.address || isAddress.address !== minterName){
      const minterNameInfo = await getNameInfo(minterName)
      minterAddress = minterNameInfo?.owner
    } else {
      minterAddress = minterName
    }

    if (!minterAddress) {
      alert(`No valid address found for minter name: ${minterName}, this should NOT have happened, please report to developers...`)
      return
    }
    const adminPublicKey = await getPublicKeyFromAddress(userState.accountAddress)
    const reason = 'Banned by Minter Admins'
    const fee = 0.01 

    const rawBanTransaction = await createGroupBanTransaction(minterAddress, adminPublicKey, 694, minterAddress, reason, txGroupId, fee)

    const signedBanTransaction = await qortalRequest({
      action: "SIGN_TRANSACTION",
      unsignedBytes: rawBanTransaction
    })

    if (!signedBanTransaction) {
      console.warn(`this only happens if the SIGN_TRANSACTION qortalRequest failed... are you using the legacy UI prior to this qortalRequest being added?`)
      alert(`this only happens if the SIGN_TRANSACTION qortalRequest failed... are you using the legacy UI prior to this qortalRequest being added? Please talk to developers.`)
      return
    }
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

const getNewestAdminCommentTimestamp = async (cardIdentifier) => {
  try {
    const comments = await fetchEncryptedComments(cardIdentifier)
    if (!comments || comments.length === 0) {
      return 0
    }
    const newestTimestamp = comments.reduce((acc, comment) => {
      const cTime = comment.updated || comment.created || 0
      return cTime > acc ? cTime : acc
    }, 0)
    return newestTimestamp
  } catch (err) {
    console.error('Failed to get newest comment timestamp:', err)
    return 0
  }
}

// Create the overall Minter Card HTML -----------------------------------------------
const createEncryptedCardHTML = async (cardData, pollResults, cardIdentifier, commentCount) => {
  const { minterName, minterAddress = '', header, content, links, creator, timestamp, poll, topicMode } = cardData
  const formattedDate = new Date(timestamp).toLocaleString()
  const minterAvatar = !topicMode ? await getMinterAvatar(minterName) : null
  const creatorAvatar = await getMinterAvatar(creator)
  const linksHTML = links.map((link, index) => `
    <button onclick="openLinkDisplayModal('${link}')">
      ${`Link ${index + 1} - ${link}`}
    </button>
  `).join("")
  const showKickedBanned = document.getElementById('admin-show-kicked-banned-checkbox')?.checked ?? false
  const showHiddenAdminCards = document.getElementById('admin-show-hidden-checkbox')?.checked ?? false

  const isUndefinedUser = (minterName === 'undefined' || minterName === 'null')

  const hasTopicMode = Object.prototype.hasOwnProperty.call(cardData, 'topicMode')

  let showTopic = false

  const { finalKickTxs, pendingKickTxs, finalBanTxs, pendingBanTxs } = await fetchAllKickBanTxData() 

  if (hasTopicMode) {
    const modeVal = cardData.topicMode
    showTopic = (modeVal === true || modeVal === 'true')
  } else {
    if (!isUndefinedUser) {
      showTopic = false
    }
  }
  let publishedMinterAddress = minterAddress

  if (publishedMinterAddress === 'notYetAdded' || publishedMinterAddress === 'undefined' || publishedMinterAddress === null || !publishedMinterAddress) {
    console.warn(`minterAddress is not published in the card data... will have to extract from minterName...`)
    publishedMinterAddress = null
  } else {
    const publishedMinterAddressInfo = await getAddressInfo(publishedMinterAddress)
    if (publishedMinterAddressInfo) {
      console.log(`minterAddress found in published data, and verified. Using published address for further checks.`)
      publishedMinterAddress = publishedMinterAddressInfo.address
    }
  }
 
  let cardColorCode = showTopic ? '#0e1b15' : '#151f28'

  const minterOrTopicHtml = ((showTopic) || (isUndefinedUser)) ? `
    <div class="support-header"><h5> REGARDING (Topic / Address): </h5></div>
    <h3>${minterName}` :
    `
    <div class="support-header"><h5> REGARDING (Name): </h5></div>
    ${minterAvatar}
    <h3>${minterName}`

  const minterGroupMembers = await fetchMinterGroupMembers()
  const minterAdmins = await fetchMinterGroupAdmins()
  const { adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, totalYes = 0, totalNo = 0, totalYesWeight = 0, totalNoWeight = 0, detailsHtml, userVote = null } = await processPollData(pollResults, minterGroupMembers, minterAdmins, creator, cardIdentifier)

  createModal('links')
  createModal('poll-details')

  let showRemoveHtml
  let altText = ''
  let penaltyText = ''
  let adjustmentText = ''
  const verifiedName = await validateMinterName(minterName)
  let levelText = '</h3>'
  const addressVerification = await getAddressInfo(minterName)
  const verifiedAddress = publishedMinterAddress ? publishedMinterAddress : addressVerification.address 

  if (verifiedName || verifiedAddress) {
    let accountInfo
    if (!verifiedAddress){
      accountInfo = await getNameInfo(verifiedName)
    }
      
    const accountAddress = verifiedAddress ? addressVerification.address : accountInfo.owner
    const addressInfo =  verifiedAddress ? addressVerification : await getAddressInfo(accountAddress)
    const minterGroupAddresses = minterGroupMembers.map(m => m.member)
    const adminAddresses = minterAdmins.map(m => m.member)
    const existingAdmin = adminAddresses.includes(accountAddress)
    const existingMinter = minterGroupAddresses.includes(accountAddress)
    
    levelText = ` - Level ${addressInfo.level}</h3>`
    console.log(`name is validated, utilizing for removal features...${verifiedName}`)
    penaltyText = addressInfo.blocksMintedPenalty == 0 ? '' : '<p>(has Blocks Penalty)<p>'
    adjustmentText = addressInfo.blocksMintedAdjustment == 0 ? '' : '<p>(has Blocks Adjustment)<p>'
    const removeActionsHtml = verifiedAddress ? await checkAndDisplayRemoveActions(adminYes, verifiedAddress, cardIdentifier, true) :  await checkAndDisplayRemoveActions(adminYes, verifiedName, cardIdentifier)
    showRemoveHtml = removeActionsHtml

    if (userVote === 0) {
      cardColorCode = "rgba(1, 65, 39, 0.41)"; // or any green you want
    } else if (userVote === 1) {
      cardColorCode = "rgba(55, 12, 12, 0.61)"; // or any red you want
    }

    const confirmedKick = finalKickTxs.some(
      (tx) => tx.groupId === 694 && tx.member === accountAddress
    )
    const pendingKick = pendingKickTxs.some(
      (tx) => tx.groupId === 694 && tx.member === accountAddress
    )
    const confirmedBan = finalBanTxs.some(
      (tx) => tx.groupId === 694 && tx.offender === accountAddress
    )
    const pendingBan = pendingBanTxs.some(
      (tx) => tx.groupId === 694 && tx.offender === accountAddress
    )
    
    // If user is definitely admin (finalAdd) and not pending removal
    if (confirmedKick && !pendingKick && !existingMinter) {
      console.warn(`account was already kicked, displaying as such...`)
      cardColorCode = 'rgb(29, 7, 4)'
      altText  = `<h4 style="color:rgb(143, 117, 21); margin-bottom: 0.5em;">KICKED From MINTER Group</h4>`
      showRemoveHtml = ''
      if (!adminBoardState.kickedCards.has(cardIdentifier)){
        adminBoardState.kickedCards.add(cardIdentifier)
      }
      if (!showKickedBanned) {
        console.warn(`kick/ban checkbox is unchecked, card is kicked, not displaying...`)
        return ''
      }
    }

    if (confirmedBan && !pendingBan && !pendingKick && !existingMinter) {
      console.warn(`account was already banned, displaying as such...`)
      cardColorCode = 'rgb(24, 3, 3)'
      altText  = `<h4 style="color:rgb(106, 2, 2); margin-bottom: 0.5em;">BANNED From MINTER Group</h4>`
      showRemoveHtml = ''
      if (!adminBoardState.bannedCards.has(cardIdentifier)){
        adminBoardState.bannedCards.add(cardIdentifier)
      }
      if (!showKickedBanned){
        console.warn(`kick/bank checkbox is unchecked, and card is banned, not displaying...`)
        return ''
      }
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
      ${minterOrTopicHtml}${levelText}
      <p>${header}</p>
      ${penaltyText}${adjustmentText}${altText}
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
