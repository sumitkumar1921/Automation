const express = require('express');
const router = express.Router();
const axios = require('axios');
const { default: stripJsonComments } = require('strip-json-comments');

router.post('/', async (req, res) => {
  try {
    const { curl, testCases } = req.body;

    if (!curl || !testCases) {
      return res.status(200).json({
        success: false,
        message: `Missing curl or testCases ${process.env.AI_API_URL}`
      });
    }

    // Clean test case JSON string (remove comments, trim)
    const cleaned = stripJsonComments(testCases)
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.trim());

    // Construct prompt for AI
    let prompt = `
You are a senior QA automation engineer.

Your task:
1. Generate a Java DataProvider class named **FetchReportDP** that loads test data from \`testData.json\` using Gson.
2. Generate a Java TestNG test class named **FetchReportTest** that calls the API using RestAssured.

Testclass
write test class seprate for each case from json
write before class where you take hit api before each @Test with each cases
 @Before class format
 String url= "";

        Response response = RestAssured.given()
                .baseUri(url)
                .header("")
                .body()  //if post api 
                .post()/get(); //depands on api metthod

@test class format for each @test class (valid and invalid)

@Test(dataProvider = "validJsonObjects",dataProviderClass = .class)
void validTestCases(JsonObject jsonObject)
Response response = DemoAppControllerAPI.fetchReport(jsonObject);
Assert.assertEquals(response.getStatusCode(),200);
Assert.assertEquals(response.jsonPath().get("status").toString(),"SUCCESS");
validate All values from responce
//Schema Validation
SchemaValidation.validateSchema(response,"DataMessageStatus.json");
}

write test data provider seprate for test each test case in Test class
data provider class format for each test class
@DataProvider(name = "validJsonObjects")
public Object[][] validtestCases() {
JsonArray jsonArray = new JsonParser().parse(new InputStreamReader(
this.getClass().getClassLoader().getResourceAsStream("testData.json")))
.getAsJsonObject().get("ValidCase").getAsJsonArray();
//Set Each Json to return Object
Object[][] returnValue = new Object[jsonArray.getAsJsonArray().size()][1];
int index = 0;
for (JsonElement each : jsonArray.getAsJsonArray()) {
returnValue[index++][0] = each;
}
//Return 1 Json Object At a Time
return returnValue;
}


Rules for the test class:
- Use the provided cURL request exactly as the request definition.
- For each field in the given test data JSON, generate **explicit assertion lines**.
- Assertion format must be:
  
- Replace <fieldPath> with the exact JSON key or path.
- Do NOT use loops, placeholders, or generic comments.
- Include schema validation for both valid and invalid responses.

Schemas:
- Generate **one JSON Schema (Draft-07)** for the VALID response.
- Generate **one JSON Schema (Draft-07)** for the INVALID response.

Output format requirement (strict):
- First code block: DataProvider class in Java.
- Second code block: Test class in Java.
- Third block: VALID response JSON Schema.
- Fourth block: INVALID response JSON Schema.

Here is the API request (cURL):
${curl}

Here is the test data JSON:
${cleaned.join('\n')}
`;

    // Call OpenRouter API
    const response = await axios.post(
      `${process.env.AI_API_URL}`,
      {
        model: 'mistralai/devstral-small',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful QA engineer that writes clean Java TestNG automation code with full assertions and JSON schemas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiOutput = response.data.choices[0].message.content;

    // --- Extract blocks ---
    const javaBlocks = aiOutput.match(/```java\n([\s\S]*?)```/g) || [];
    const jsonBlocks = aiOutput.match(/```json\n([\s\S]*?)```/g) || [];

    if (javaBlocks.length < 2 || jsonBlocks.length < 2) {
      return res.status(500).json({
        success: false,
        message: 'AI response did not contain the expected 4 blocks (2 Java + 2 JSON).'
      });
    }

    const dataProvider = javaBlocks[0].replace(/```java\n|```/g, '').trim();
    const testClass = javaBlocks[1].replace(/```java\n|```/g, '').trim();
    const validSchema = jsonBlocks[0].replace(/```json\n|```/g, '').trim();
    const invalidSchema = jsonBlocks[1].replace(/```json\n|```/g, '').trim();

    return res.json({
      success: true,
      dataProvider,
      testClass,
      "schema in valid case": validSchema,
      "schema in invalid case": invalidSchema
    });

  } catch (error) {
    console.error('Error in /automate-api:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
