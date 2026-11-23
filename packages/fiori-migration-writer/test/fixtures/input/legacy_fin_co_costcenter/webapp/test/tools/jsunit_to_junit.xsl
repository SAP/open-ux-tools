<?xml version="1.0"?>
<xsl:stylesheet version="1.0"  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

	<xsl:output method="xml" indent="yes" encoding="UTF-8"/>
	<xsl:template match="browserResult">
		<!--  Get browser name including browser version -->	  
		<xsl:variable name="browserDisplayName" select="browser/displayName" />
		<xsl:variable name="_browser">
			<xsl:choose>
				<xsl:when test="contains($browserDisplayName,'Chrome')">
					<xsl:value-of select="substring-before(substring-after($browserDisplayName,'Google\'),'\Application')" />
				</xsl:when>
				<xsl:otherwise>
					<xsl:value-of select="$browserDisplayName" />
				</xsl:otherwise>
			</xsl:choose>
		</xsl:variable>		
		<xsl:variable name="userAgent" select="properties/property[@name='userAgent']/@value" />
		<xsl:variable name="browserVersion">
			<xsl:choose>
				<xsl:when test="contains($_browser,'Internet Explorer')">
					<xsl:variable name="subString" select="substring-after($userAgent,'MSIE ')" />
					<xsl:value-of select="substring($subString,1,1)" />
				</xsl:when>
				<xsl:when test="contains($_browser,'Firefox')">
					<xsl:variable name="subString" select="substring-after($userAgent,'Firefox/')" />
					<xsl:choose>
						<xsl:when test="contains($subString,'3.6')">
							<xsl:value-of select="substring($subString,1,3)" />
						</xsl:when>
						<xsl:otherwise>
							<xsl:value-of select="substring($subString,1,4)" />
						</xsl:otherwise>
					</xsl:choose>
				</xsl:when>
				<xsl:when test="contains($_browser,'Safari')">
					<xsl:variable name="subString" select="substring-after($userAgent,'Version/')" />
					<xsl:value-of select="substring($subString,1,3)" />
				</xsl:when>
				<xsl:when test="contains($_browser,'Chrome')">
					<xsl:variable name="subString" select="substring-after($userAgent,'Chrome/')" />
					<xsl:value-of select="substring($subString,1,4)" />
				</xsl:when>
				<xsl:otherwise>
					<xsl:value-of select="'unknown'" />
				</xsl:otherwise>
			</xsl:choose>
		</xsl:variable>
		<xsl:variable name="browser">
			<xsl:choose>
				<xsl:when test="$browserVersion != 'unknown'">
					<xsl:value-of select="normalize-space(concat($_browser,' ',$browserVersion))" />
				</xsl:when>
				<xsl:otherwise>
					<xsl:value-of select="normalize-space($_browser)" />
				</xsl:otherwise>
			</xsl:choose>
		</xsl:variable>

		<xsl:variable name="numberOfTests" select="count(descendant::testCaseResult)" />
		<xsl:variable name="numberOfErrors" select="count(descendant::error)" />
		<xsl:variable name="numberOfFailures" select="count(descendant::failure)" />
		<xsl:variable name="hostName" select="properties/property[@name = 'remoteAddress']/@value" />
		<xsl:variable name="testSuiteName" select="properties/property[@name = 'testPage']/@value" />
		<xsl:variable name="totalTime" select='format-number(sum(descendant::testCaseResult/@time), "#.###")' />
		
		<xsl:choose>
			<xsl:when test="@type != 'SUCCESS' and @type != 'ERROR' and @type != 'FAILURE'">
			
				<!-- report errors -->
				<testsuite errors="1" failures="0" hostname="{$hostName}" name="{$browser}" tests="1" time="{$totalTime}">
					<testcase classname="{$browser}" name="error" time="{@time}">
						<error message="{@type}" type="{@type}"><xsl:value-of select="@type"></xsl:value-of></error>
					</testcase>
				</testsuite>
			
			</xsl:when>
			<xsl:otherwise>
			
				<!-- <testsuites> -->
					<testsuite errors="{$numberOfErrors}" failures="{$numberOfFailures}" hostname="{$hostName}" name="{$browser}.{$testSuiteName}" tests="{$numberOfTests}" time="{$totalTime}">
						<xsl:copy-of select="properties" /> <!-- copy all properties -->
						<xsl:for-each select="testCaseResults/testCaseResult">
						  <xsl:variable name="classname">
							  <xsl:call-template name="get-classname">
								  <xsl:with-param name="testname" select="substring-before(@name,'.html:')"/>
							  </xsl:call-template>
						  </xsl:variable>
						  <testcase classname="{$browser}.{$classname}" name="{substring-after(@name,'.html:')}" time="{@time}">
							   <xsl:copy-of select="*" /> <!-- copy all failures and errors -->
						  </testcase>
						</xsl:for-each>
					</testsuite>
				 <!-- </testsuites> -->
		
			</xsl:otherwise>
		</xsl:choose>

	</xsl:template>

	<!-- recursively strips slashes from the beginning until none are left -->
	<xsl:template name="get-classname">
		<xsl:param name="testname" />
		<xsl:choose>
			<xsl:when test="contains($testname, '/')">
				<xsl:call-template name="get-classname">
					<xsl:with-param name="testname" select="substring-after($testname, '/')" />
				</xsl:call-template>
			</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="$testname" />
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
</xsl:stylesheet>