<?php
/**
 * @copyright  (C) 2026 COLORPACK CREATION CO., LTD.
 * @license    GNU General Public License version 2 or later
 */

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\Database\DatabaseInterface;

class PlgContentColorpackembedInstallerScript
{
	public function preflight($type, $parent)
	{
		if (version_compare(JVERSION, '4.4', '<') || version_compare(PHP_VERSION, '8.1', '<'))
		{
			Factory::getApplication()->enqueueMessage('Colorpack Video Embed requires Joomla 4.4+ and PHP 8.1+.', 'error');

			return false;
		}

		return true;
	}

	public function postflight($type, $parent)
	{
		if ($type !== 'install')
		{
			return;
		}

		$db    = Factory::getContainer()->get(DatabaseInterface::class);
		$query = $db->getQuery(true)
			->update($db->quoteName('#__extensions'))
			->set($db->quoteName('enabled') . ' = 1')
			->where($db->quoteName('type') . ' = ' . $db->quote('plugin'))
			->where($db->quoteName('folder') . ' = ' . $db->quote('content'))
			->where($db->quoteName('element') . ' = ' . $db->quote('colorpackembed'));
		$db->setQuery($query)->execute();
	}
}
